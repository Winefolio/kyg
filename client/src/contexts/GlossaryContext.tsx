import React, { createContext, useContext, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { GlossaryTerm } from '@shared/schema';

interface GlossaryContextType {
  terms: GlossaryTerm[];
  isLoading: boolean;
  error: Error | null;
}

const GlossaryContext = createContext<GlossaryContextType | undefined>(undefined);

export function GlossaryProvider({ children }: { children: React.ReactNode }) {
  const { data: terms = [], isLoading, error } = useQuery<GlossaryTerm[]>({
    queryKey: ['/api/glossary'],
    staleTime: 1000 * 60 * 15, // 15 minutes - glossary terms don't change often
    gcTime: 1000 * 60 * 30, // 30 minutes
  });

  return (
    <GlossaryContext.Provider value={{ terms, isLoading, error }}>
      {children}
    </GlossaryContext.Provider>
  );
}

export function useGlossary() {
  const context = useContext(GlossaryContext);
  if (context === undefined) {
    throw new Error('useGlossary must be used within a GlossaryProvider');
  }
  return context;
}