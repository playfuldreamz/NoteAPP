graph LR
    %% Backend Section %%
    subgraph Backend
        subgraph Services
            subgraph AI
                AI_Config[config.js]
                AI_Factory[factory.js]
                AI_Base[base.js]
                AI_OpenAI[openai.js]
                AI_DeepSeek[deepseek.js]
                AI_Gemini[gemini.js]
                AI_ActionItems[actionItems.js]
                AI_Summarization[summarization.js]
                AI_Tagging[tagging.js]
                AI_Transcription[transcription.js]

                AI_Config --> AI_Factory
                AI_Factory --> AI_Base
                AI_Factory --> AI_OpenAI
                AI_Factory --> AI_DeepSeek
                AI_Factory --> AI_Gemini
                AI_Factory --> AI_ActionItems
                AI_Factory --> AI_Summarization
                AI_Factory --> AI_Tagging
                AI_Factory --> AI_Transcription
            end
            DeleteService[deleteService.js]
        end

        Server[server.js]
        Server --> Services

        subgraph Routes
            Notes[notes.js]
            Transcripts[transcripts.js]
            ActionItems[actionItems.js]
            AI_Routes[ai.js]
            
            Notes --> Server
            Transcripts --> Server
            ActionItems --> Server
            AI_Routes --> Server
        end
    end

    %% Frontend Section %%
    subgraph Frontend
        subgraph Components
            AudioRecorder[AudioRecorder.tsx]
            NoteList[NoteList.tsx]
            NoteSaver[NoteSaver.tsx]
            TranscriptsList[TranscriptsList.tsx]
            TranscriptActions[TranscriptActions.tsx]
            TaggingModule[TaggingModule.tsx]
            ActionItemsModule[ActionItemsModule.tsx]
            Navbar[Navbar.tsx]
            LoginForm[LoginForm.tsx]
            RegisterForm[RegisterForm.tsx]
            Modal[Modal.tsx]
            SettingsModal[SettingsModal.tsx]
            TagChip[TagChip.tsx]
            TagCreator[TagCreator.tsx]
            UserTagChip[UserTagChip.tsx]
            DarkModeToggle[DarkModeToggle.tsx]
            ThemeProvider[ThemeProvider.tsx]
            MainContent[MainContent.tsx]
            Sidebar[Sidebar.tsx]
        end

        subgraph Services
            AI_Frontend[ai.ts]
            DeleteService_Frontend[deleteService.ts]
            UserTags[userTags.ts]
            
            subgraph Transcription
                TranscriptionProviderFactory[providerFactory.ts]
                AssemblyAI[AssemblyAIProvider.ts]
                Deepgram[DeepgramProvider.ts]
                WebSpeech[WebSpeechProvider.ts]

                TranscriptionProviderFactory --> AssemblyAI
                TranscriptionProviderFactory --> Deepgram
                TranscriptionProviderFactory --> WebSpeech
            end
        end

        subgraph Context
            TagsContext[TagsContext.tsx]
            TranscriptionContext[TranscriptionContext.tsx]
        end

        subgraph Hooks
            useDownloadDocument[useDownloadDocument.ts]
            useTheme[useTheme.ts]
            useTitleGeneration[useTitleGeneration.ts]
        end

        App[layout.tsx]
        App --> Components
        App --> Services
        App --> Context
        App --> Hooks
    end

    Backend -->|API Calls| Frontend
    
    %% Styling for better readability %%
    style AI_Config fill:#d60000,stroke:#333,stroke-width:2px
    style Server fill:#d60000,stroke:#333,stroke-width:2px
    style App fill:#d60000,stroke:#333,stroke-width:2px
