import React, { createContext, useContext, useState, ReactNode } from 'react';

interface DepositModalContextType {
  isOpen: boolean;
  openModal: () => void;
  closeModal: () => void;
}

const DepositModalContext = createContext<DepositModalContextType | undefined>(undefined);

export const useDepositModal = () => {
  const context = useContext(DepositModalContext);
  if (!context) {
    throw new Error('useDepositModal must be used within DepositModalProvider');
  }
  return context;
};

interface DepositModalProviderProps {
  children: ReactNode;
}

export const DepositModalProvider: React.FC<DepositModalProviderProps> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);

  const openModal = () => setIsOpen(true);
  const closeModal = () => setIsOpen(false);

  return (
    <DepositModalContext.Provider value={{ isOpen, openModal, closeModal }}>
      {children}
    </DepositModalContext.Provider>
  );
};
