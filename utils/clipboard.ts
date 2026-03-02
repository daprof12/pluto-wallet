/**
 * Copy text to clipboard with fallback methods
 * Tries modern Clipboard API first, then falls back to older methods
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  // Method 1: Try modern Clipboard API
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    // Method 2: Try execCommand (older method)
    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      
      if (successful) {
        return true;
      }
    } catch (execErr) {
      // Method 2 failed, continue to Method 3
    }
    
    // Method 3: Fallback - show prompt for manual copy
    const userAgent = navigator.userAgent.toLowerCase();
    const isMobile = /iphone|ipad|ipod|android/.test(userAgent);
    
    if (isMobile) {
      // On mobile, try to select text in a prompt
      prompt('Copy this text:', text);
    } else {
      // On desktop, show a styled alert
      alert(`Please copy this text manually:\n\n${text}`);
    }
    
    return false;
  }
}
