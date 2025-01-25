import ServerLayout from "./ServerLayout";
import ClientLayout from "./ClientLayout";
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { TagsProvider } from '../context/TagsContext';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ServerLayout>
      <ClientLayout>
        <TagsProvider>
          {children}
          <ToastContainer />
        </TagsProvider>
      </ClientLayout>
    </ServerLayout>
  );
}
