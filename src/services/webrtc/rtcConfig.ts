/**
 * ROOM WebRTC ICE Server Configuration
 * Configurable via environment variables for STUN and TURN
 */

export function getRTCConfiguration(): RTCConfiguration {
  const iceServers: RTCIceServer[] = [];

  // STUN Server (default to Google's public STUN if none specified)
  const stunUrl = import.meta.env.VITE_STUN_SERVER || 'stun:stun.l.google.com:19302';
  iceServers.push({ urls: stunUrl });

  // Secondary public STUN backup
  iceServers.push({ urls: 'stun:stun1.l.google.com:19302' });

  // Configurable TURN Server for production NAT traversal
  const turnServer = import.meta.env.VITE_TURN_SERVER;
  const turnUsername = import.meta.env.VITE_TURN_USERNAME;
  const turnCredential = import.meta.env.VITE_TURN_CREDENTIAL;

  if (turnServer) {
    const turnConfig: RTCIceServer = {
      urls: turnServer,
    };
    if (turnUsername && turnCredential) {
      turnConfig.username = turnUsername;
      turnConfig.credential = turnCredential;
    }
    iceServers.push(turnConfig);
  }

  return {
    iceServers,
    iceCandidatePoolSize: 4,
    bundlePolicy: 'max-bundle',
    rtcpMuxPolicy: 'require',
  };
}
