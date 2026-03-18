import React from 'react';
import { createRoot } from 'react-dom/client';
import ClassManager from '../src/components/ClassManager';

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(
    <React.StrictMode>
      <ClassManager />
    </React.StrictMode>
  );
}
