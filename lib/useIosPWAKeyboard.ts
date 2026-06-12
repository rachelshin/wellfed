import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

// iOS PWA keyboard fix: the layout viewport doesn't shrink when the keyboard
// opens (only the visual viewport does), so KeyboardAvoidingView never fires.
// Returns the keyboard height to apply as extra paddingBottom on sheets/modals.
export default function useIosPWAKeyboard(): number {
  const [keyboard, setKeyboard] = useState(0);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    if (!window.navigator?.standalone || !window.visualViewport) return;
    const onResize = () =>
      setKeyboard(Math.max(0, window.innerHeight - window.visualViewport!.height));
    window.visualViewport.addEventListener('resize', onResize);
    return () => window.visualViewport!.removeEventListener('resize', onResize);
  }, []);

  return keyboard;
}
