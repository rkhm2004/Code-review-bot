'use client';

import { useState, useEffect } from 'react';
import ReactDiffViewer from 'react-diff-viewer-continued';
import { api } from '@/lib/api';

interface DiffViewerProps {
  owner: string;
  repo: string;
  prNumber: number;
}

export default function DiffViewer({ owner, repo, prNumber }: DiffViewerProps) {
  const [diff, setDiff] = useState('');

  useEffect(() => {
    const fetchDiff = async () => {
      try {
        const result = await api.startReview({ owner, repo, pull_number: prNumber });
        setDiff(result.content[0].text);
      } catch (error) {
        console.error("Failed to load diff:", error);
      }
    };
    fetchDiff();
  }, [owner, repo, prNumber]);

  return (
    <div className="rounded-lg overflow-hidden border border-slate-800 font-mono text-xs shadow-inner">
      <ReactDiffViewer
        oldValue=""
        newValue={diff}
        splitView={false}
        useDarkTheme={true}
        styles={{
          variables: {
            dark: {
              diffViewerBackground: '#020617',
              addedBackground: '#064e3b',
              addedColor: '#34d399',
              removedBackground: '#7f1d1d',
              removedColor: '#f87171',
              wordAddedBackground: '#065f46',
              wordRemovedBackground: '#991b1b',
            }
          }
        }}
      />
    </div>
  );
}