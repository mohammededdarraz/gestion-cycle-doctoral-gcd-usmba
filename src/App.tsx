/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AdminWorkspace } from './components/AdminWorkspace';
import { CandidateWorkspace } from './components/CandidateWorkspace';
import { CommissionWorkspace } from './components/CommissionWorkspace';
import { PublicPortal } from './components/PublicPortal';
import { GCDProvider, useGCD } from './context/GCDContext';

const AppRouter: React.FC = () => {
  const { currentUser } = useGCD();

  if (!currentUser) {
    return <PublicPortal />;
  }

  if (currentUser.role === 'candidat') {
    return <CandidateWorkspace />;
  }

  if (currentUser.role === 'commission') {
    return <CommissionWorkspace />;
  }

  return <AdminWorkspace />;
};

export default function App() {
  return (
    <GCDProvider>
      <AppRouter />
    </GCDProvider>
  );
}
