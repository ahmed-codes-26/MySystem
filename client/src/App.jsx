import { lazy, Suspense } from 'react';
import AuthGate from './context/AuthGate';
import PageSkeleton from './components/PageSkeleton';
import { Navigate, Route, Routes } from 'react-router';
import AppShell from './components/layout/AppShell';
const Finance=lazy(()=>import('./pages/Finance')), PasswordVault=lazy(()=>import('./pages/PasswordVault')), Habits=lazy(()=>import('./pages/Habits')), Dashboard=lazy(()=>import('./pages/Dashboard'));
export default function App() { return <AuthGate><AppShell><Suspense fallback={<PageSkeleton/>}><Routes><Route path="/" element={<Dashboard />} /><Route path="/finance" element={<Finance />} /><Route path="/passwords" element={<PasswordVault />} /><Route path="/settings" element={<Habits />} /><Route path="/habits" element={<Navigate to="/settings" replace />} /><Route path="*" element={<Navigate to="/" replace />} /></Routes></Suspense></AppShell></AuthGate>; }
