import React, { useEffect } from 'react';
import { Modal, ModalProps, Platform } from 'react-native';

export default function AppModal({ visible, children, ...props }: ModalProps) {
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    document.body.style.overflow = visible ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [visible]);

  return <Modal visible={visible} {...props}>{children}</Modal>;
}
