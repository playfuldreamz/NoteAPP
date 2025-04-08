"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import Modal from '../../../components/Modal';
import StatsRow from '../../../components/home/StatsRow';
import QuickActionsWidget from '../../../components/home/QuickActionsWidget';
import RecentActivityWidget from '../../../components/home/RecentActivityWidget';
import RecentRecordingsWidget from '../../../components/home/RecentRecordingsWidget';
import FocusAreasWidget from '../../../components/home/FocusAreasWidget';
import VoiceInsightsSection from '../../../components/home/VoiceInsightsSection';
import NoteInsightsSection from '../../../components/home/NoteInsightsSection';

// Define types for Note and Transcript directly in this file
interface Note {
  id: number;
  title: string;
  content: string;
  tags: Array<{ id: number; name: string }>;
}

interface Transcript {
  id: number;
  title: string;
  text: string;
  duration: number;
  tags?: Array<{ id: number; name: string }>;
}

export default function HomePage() {
  const [stats, setStats] = useState({
    totalNotes: 0,
    totalRecordings: 0,
    totalTags: 0,
    recordingTime: 0
  });

  // Update modalState type to include 'tags'
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    content: string;
    title: string;
    itemId: number;
    type: 'note' | 'transcript';
    tags?: Array<{ id: number; name: string }>;
  }>({
    isOpen: false,
    content: '',
    title: '',
    itemId: 0,
    type: 'note'
  });

  // Update state definitions
  const [focusNoteTags, setFocusNoteTags] = useState<Array<{ tag: string; count: number }>>([]);
  const [focusTranscriptTags, setFocusTranscriptTags] = useState<Array<{ tag: string; count: number }>>([]);
  const [isLoadingFocusTags, setIsLoadingFocusTags] = useState(true);

  const fetchHomePageData = useCallback(async () => {
    setIsLoadingFocusTags(true);
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const [notesRes, transcriptsRes] = await Promise.all([
        fetch(`http://localhost:5000/api/notes?limit=50&offset=0`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`http://localhost:5000/api/transcripts?limit=50&offset=0`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      if (!notesRes.ok || !transcriptsRes.ok) {
        throw new Error('Failed to fetch initial data for stats/focus');
      }

      const notesData: { totalItems: number; data: Note[] } = await notesRes.json();
      const transcriptsData: { totalItems: number; data: Transcript[] } = await transcriptsRes.json();

      // Update totalNotes and totalRecordings calculations
      const totalNotes = notesData.data.length || 0;
      const totalRecordings = transcriptsData.data.length || 0;
      const allNoteTags = (notesData.data || []).flatMap((note: Note) => note.tags.map((tag: { id: number; name: string }) => tag.name));
      const allTranscriptTags = (transcriptsData.data || []).flatMap((t: Transcript) => (t.tags || []).map((tag: { id: number; name: string }) => tag.name));
      const totalUniqueTags = new Set([...allNoteTags, ...allTranscriptTags]).size;
      // Ensure `transcriptsData.data` defaults to an empty array before calling `reduce`
      const recordingTime = (transcriptsData.data || []).reduce((acc: number, curr: Transcript) => acc + (curr.duration || 0), 0);

      setStats({ totalNotes, totalRecordings, totalTags: totalUniqueTags, recordingTime });

      const noteTagCounts: Record<string, number> = {};
      allNoteTags.forEach((tag: string) => { noteTagCounts[tag] = (noteTagCounts[tag] || 0) + 1; });
      setFocusNoteTags(Object.entries(noteTagCounts).map(([tag, count]) => ({ tag, count })));

      const transcriptTagCounts: Record<string, number> = {};
      allTranscriptTags.forEach((tag: string) => { transcriptTagCounts[tag] = (transcriptTagCounts[tag] || 0) + 1; });
      setFocusTranscriptTags(Object.entries(transcriptTagCounts).map(([tag, count]) => ({ tag, count })));
      setIsLoadingFocusTags(false);

    } catch (error) {
      console.error('Error fetching home page data:', error);
      toast.error('Failed to load dashboard data');
      setIsLoadingFocusTags(false);
    }
  }, []);

  useEffect(() => {
    fetchHomePageData();
  }, [fetchHomePageData]);

  const handleItemClick = (item: Note | Transcript, type: 'note' | 'transcript') => {
    const content = type === 'note' ? (item as Note).content : (item as Transcript).text;
    setModalState({
      isOpen: true, content, title: item.title || 'Untitled', itemId: item.id, type, tags: 'tags' in item ? item.tags : undefined
    });
  };

  const handleCloseModal = () => {
    setModalState(prev => ({ ...prev, isOpen: false }));
  };

  return (
    <div className="grid grid-flow-row gap-8">
      <StatsRow stats={stats} />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        <QuickActionsWidget />
        <RecentActivityWidget onItemClick={handleItemClick} />
        <RecentRecordingsWidget onItemClick={handleItemClick} />
        <FocusAreasWidget
          noteTags={focusNoteTags}
          transcriptTags={focusTranscriptTags}
          isLoading={isLoadingFocusTags}
        />
      </div>

      <VoiceInsightsSection />
      <NoteInsightsSection />

      <Modal
        isOpen={modalState.isOpen}
        onClose={handleCloseModal}
        content={modalState.content}
        title={modalState.title}
        itemId={modalState.itemId}
        type={modalState.type as 'note' | 'transcript'}
      />
    </div>
  );
}
