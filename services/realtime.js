/**
 * Advanced Real-time Communication Service
 * WebRTC, video calls, screen sharing, collaborative features, and real-time data sync
 */

const EventEmitter = require('events');
const crypto = require('crypto');

class AdvancedRealtimeService extends EventEmitter {
    constructor() {
        super();
        this.rooms = new Map();
        this.connections = new Map();
        this.webrtcPeers = new Map();
        this.collaborativeSessions = new Map();
        this.dataChannels = new Map();
        this.mediaStreams = new Map();
        this.screenShares = new Map();
        
        this.config = {
            webrtc: {
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:stun1.l.google.com:19302' },
                    {
                        urls: 'turn:your-turn-server.com:3478',
                        username: 'username',
                        credential: 'password'
                    }
                ],
                sdpSemantics: 'unified-plan',
                bundlePolicy: 'max-bundle',
                rtcpMuxPolicy: 'require'
            },
            media: {
                video: {
                    width: { min: 640, ideal: 1280, max: 1920 },
                    height: { min: 480, ideal: 720, max: 1080 },
                    frameRate: { min: 15, ideal: 30, max: 60 }
                },
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                    sampleRate: 48000
                },
                screen: {
                    video: {
                        cursor: 'always',
                        displaySurface: 'monitor'
                    },
                    audio: true
                }
            },
            collaboration: {
                maxParticipants: 50,
                documentSyncInterval: 100, // ms
                cursorUpdateInterval: 50, // ms
                maxHistorySize: 1000
            },
            quality: {
                adaptiveBitrate: true,
                maxBitrate: 2000000, // 2 Mbps
                minBitrate: 100000,  // 100 Kbps
                targetLatency: 100   // ms
            }
        };
        
        this.initializeRealtime();
    }

    initializeRealtime() {
        this.setupSignalingServer();
        this.setupCollaborativeEngine();
        this.setupQualityMonitoring();
        this.startHeartbeat();
        
        console.log('🔄 Advanced Real-time Service initialized');
    }

    // Room Management
    async createRoom(roomId, options = {}) {
        try {
            if (this.rooms.has(roomId)) {
                throw new Error('Room already exists');
            }
            
            const room = {
                id: roomId,
                type: options.type || 'conference', // conference, webinar, collaboration
                participants: new Map(),
                mediaStreams: new Map(),
                dataChannels: new Map(),
                settings: {
                    maxParticipants: options.maxParticipants || 10,
                    requireAuth: options.requireAuth || false,
                    recordSession: options.recordSession || false,
                    allowScreenShare: options.allowScreenShare !== false,
                    allowChat: options.allowChat !== false,
                    allowFileShare: options.allowFileShare || false,
                    moderationEnabled: options.moderationEnabled || false
                },
                state: {
                    isRecording: false,
                    activeScreenShare: null,
                    chatHistory: [],
                    sharedFiles: [],
                    whiteboard: {
                        elements: [],
                        version: 0
                    }
                },
                created: Date.now(),
                lastActivity: Date.now()
            };
            
            this.rooms.set(roomId, room);
            
            this.emit('roomCreated', { roomId, room });
            console.log(`📹 Room ${roomId} created`);
            
            return room;
            
        } catch (error) {
            console.error('❌ Room creation error:', error);
            throw error;
        }
    }

    async joinRoom(roomId, userId, userInfo = {}) {
        try {
            const room = this.rooms.get(roomId);
            if (!room) {
                throw new Error('Room not found');
            }
            
            if (room.participants.size >= room.settings.maxParticipants) {
                throw new Error('Room is full');
            }
            
            const participant = {
                id: userId,
                name: userInfo.name || `User ${userId}`,
                avatar: userInfo.avatar || null,
                role: userInfo.role || 'participant', // host, moderator, participant
                permissions: {
                    canSpeak: true,
                    canVideo: true,
                    canScreenShare: room.settings.allowScreenShare,
                    canChat: room.settings.allowChat,
                    canModerate: userInfo.role === 'moderator' || userInfo.role === 'host'
                },
                media: {
                    audio: false,
                    video: false,
                    screen: false
                },
                connection: {
                    quality: 'good',
                    latency: 0,
                    bandwidth: 0,
                    connected: true
                },
                joinedAt: Date.now(),
                lastSeen: Date.now()
            };
            
            room.participants.set(userId, participant);
            room.lastActivity = Date.now();
            
            // Notify other participants
            this.broadcastToRoom(roomId, 'participantJoined', {
                participant,
                totalParticipants: room.participants.size
            }, userId);
            
            this.emit('participantJoined', { roomId, userId, participant });
            
            return {
                room: this.getRoomInfo(roomId),
                participant,
                existingParticipants: Array.from(room.participants.values())
            };
            
        } catch (error) {
            console.error('❌ Join room error:', error);
            throw error;
        }
    }

    // WebRTC Peer Connection Management
    async createPeerConnection(roomId, fromUserId, toUserId) {
        try {
            const connectionId = `${fromUserId}-${toUserId}`;
            
            // Simulate WebRTC peer connection
            const peerConnection = {
                id: connectionId,
                roomId,
                fromUserId,
                toUserId,
                state: 'connecting',
                iceConnectionState: 'new',
                signalingState: 'stable',
                localDescription: null,
                remoteDescription: null,
                dataChannel: null,
                mediaStreams: new Map(),
                stats: {
                    bytesReceived: 0,
                    bytesSent: 0,
                    packetsLost: 0,
                    jitter: 0,
                    rtt: 0
                },
                created: Date.now()
            };
            
            this.webrtcPeers.set(connectionId, peerConnection);
            
            // Simulate connection establishment
            setTimeout(() => {
                peerConnection.state = 'connected';
                peerConnection.iceConnectionState = 'connected';
                this.emit('peerConnected', peerConnection);
            }, 1000);
            
            return peerConnection;
            
        } catch (error) {
            console.error('❌ Peer connection error:', error);
            throw error;
        }
    }

    async handleOffer(roomId, fromUserId, toUserId, offer) {
        try {
            const connectionId = `${fromUserId}-${toUserId}`;
            let peerConnection = this.webrtcPeers.get(connectionId);
            
            if (!peerConnection) {
                peerConnection = await this.createPeerConnection(roomId, fromUserId, toUserId);
            }
            
            peerConnection.remoteDescription = offer;
            
            // Generate answer
            const answer = {
                type: 'answer',
                sdp: this.generateSDP('answer'),
                timestamp: Date.now()
            };
            
            peerConnection.localDescription = answer;
            
            this.emit('answerGenerated', {
                connectionId,
                fromUserId: toUserId,
                toUserId: fromUserId,
                answer
            });
            
            return answer;
            
        } catch (error) {
            console.error('❌ Handle offer error:', error);
            throw error;
        }
    }

    async handleAnswer(roomId, fromUserId, toUserId, answer) {
        try {
            const connectionId = `${toUserId}-${fromUserId}`;
            const peerConnection = this.webrtcPeers.get(connectionId);
            
            if (!peerConnection) {
                throw new Error('Peer connection not found');
            }
            
            peerConnection.remoteDescription = answer;
            peerConnection.state = 'connected';
            
            this.emit('peerConnectionEstablished', {
                connectionId,
                roomId,
                participants: [fromUserId, toUserId]
            });
            
        } catch (error) {
            console.error('❌ Handle answer error:', error);
            throw error;
        }
    }

    async handleIceCandidate(connectionId, candidate) {
        try {
            const peerConnection = this.webrtcPeers.get(connectionId);
            if (!peerConnection) {
                throw new Error('Peer connection not found');
            }
            
            // Process ICE candidate
            this.emit('iceCandidateProcessed', {
                connectionId,
                candidate
            });
            
        } catch (error) {
            console.error('❌ ICE candidate error:', error);
            throw error;
        }
    }

    // Media Stream Management
    async addMediaStream(roomId, userId, streamType, streamData) {
        try {
            const room = this.rooms.get(roomId);
            if (!room) throw new Error('Room not found');
            
            const participant = room.participants.get(userId);
            if (!participant) throw new Error('Participant not found');
            
            const streamId = crypto.randomUUID();
            const mediaStream = {
                id: streamId,
                userId,
                roomId,
                type: streamType, // audio, video, screen
                quality: streamData.quality || 'high',
                resolution: streamData.resolution || '720p',
                bitrate: streamData.bitrate || 1000000,
                frameRate: streamData.frameRate || 30,
                active: true,
                muted: false,
                created: Date.now()
            };
            
            room.mediaStreams.set(streamId, mediaStream);
            participant.media[streamType] = true;
            
            // Handle screen sharing
            if (streamType === 'screen') {
                if (room.state.activeScreenShare) {
                    throw new Error('Screen sharing already active');
                }
                room.state.activeScreenShare = userId;
                this.screenShares.set(roomId, {
                    userId,
                    streamId,
                    startTime: Date.now()
                });
            }
            
            // Broadcast to other participants
            this.broadcastToRoom(roomId, 'mediaStreamAdded', {
                userId,
                streamType,
                streamId,
                mediaStream
            }, userId);
            
            this.emit('mediaStreamAdded', { roomId, userId, streamType, mediaStream });
            
            return mediaStream;
            
        } catch (error) {
            console.error('❌ Add media stream error:', error);
            throw error;
        }
    }

    async removeMediaStream(roomId, userId, streamType) {
        try {
            const room = this.rooms.get(roomId);
            if (!room) throw new Error('Room not found');
            
            const participant = room.participants.get(userId);
            if (!participant) throw new Error('Participant not found');
            
            // Find and remove stream
            for (const [streamId, stream] of room.mediaStreams.entries()) {
                if (stream.userId === userId && stream.type === streamType) {
                    room.mediaStreams.delete(streamId);
                    participant.media[streamType] = false;
                    
                    // Handle screen sharing
                    if (streamType === 'screen' && room.state.activeScreenShare === userId) {
                        room.state.activeScreenShare = null;
                        this.screenShares.delete(roomId);
                    }
                    
                    // Broadcast to other participants
                    this.broadcastToRoom(roomId, 'mediaStreamRemoved', {
                        userId,
                        streamType,
                        streamId
                    }, userId);
                    
                    this.emit('mediaStreamRemoved', { roomId, userId, streamType, streamId });
                    break;
                }
            }
            
        } catch (error) {
            console.error('❌ Remove media stream error:', error);
            throw error;
        }
    }

    // Real-time Chat
    async sendChatMessage(roomId, userId, message) {
        try {
            const room = this.rooms.get(roomId);
            if (!room) throw new Error('Room not found');
            
            const participant = room.participants.get(userId);
            if (!participant || !participant.permissions.canChat) {
                throw new Error('Chat permission denied');
            }
            
            const chatMessage = {
                id: crypto.randomUUID(),
                userId,
                userName: participant.name,
                message: message.text,
                type: message.type || 'text', // text, emoji, file, system
                timestamp: Date.now(),
                edited: false,
                reactions: new Map()
            };
            
            room.state.chatHistory.push(chatMessage);
            
            // Limit chat history
            if (room.state.chatHistory.length > 1000) {
                room.state.chatHistory = room.state.chatHistory.slice(-1000);
            }
            
            this.broadcastToRoom(roomId, 'chatMessage', chatMessage);
            
            this.emit('chatMessageSent', { roomId, userId, message: chatMessage });
            
            return chatMessage;
            
        } catch (error) {
            console.error('❌ Send chat message error:', error);
            throw error;
        }
    }

    // Collaborative Features
    setupCollaborativeEngine() {
        // Document collaboration
        this.collaborativeDocuments = new Map();
        
        // Whiteboard collaboration
        this.whiteboards = new Map();
        
        // Cursor tracking
        this.cursors = new Map();
    }

    async createCollaborativeDocument(roomId, documentId, initialContent = '') {
        try {
            const document = {
                id: documentId,
                roomId,
                content: initialContent,
                version: 0,
                operations: [],
                cursors: new Map(),
                selections: new Map(),
                collaborators: new Set(),
                lastModified: Date.now(),
                created: Date.now()
            };
            
            this.collaborativeDocuments.set(documentId, document);
            
            this.emit('documentCreated', { roomId, documentId, document });
            
            return document;
            
        } catch (error) {
            console.error('❌ Create collaborative document error:', error);
            throw error;
        }
    }

    async applyDocumentOperation(documentId, userId, operation) {
        try {
            const document = this.collaborativeDocuments.get(documentId);
            if (!document) throw new Error('Document not found');
            
            const op = {
                id: crypto.randomUUID(),
                userId,
                type: operation.type, // insert, delete, retain
                position: operation.position,
                content: operation.content,
                length: operation.length,
                version: document.version + 1,
                timestamp: Date.now()
            };
            
            // Apply operation to document
            switch (op.type) {
                case 'insert':
                    document.content = document.content.slice(0, op.position) + 
                                     op.content + 
                                     document.content.slice(op.position);
                    break;
                case 'delete':
                    document.content = document.content.slice(0, op.position) + 
                                     document.content.slice(op.position + op.length);
                    break;
            }
            
            document.version = op.version;
            document.operations.push(op);
            document.lastModified = Date.now();
            document.collaborators.add(userId);
            
            // Broadcast operation to other collaborators
            this.broadcastToRoom(document.roomId, 'documentOperation', {
                documentId,
                operation: op,
                newVersion: document.version
            }, userId);
            
            this.emit('documentUpdated', { documentId, operation: op, document });
            
            return op;
            
        } catch (error) {
            console.error('❌ Apply document operation error:', error);
            throw error;
        }
    }

    async updateCursor(documentId, userId, position) {
        try {
            const document = this.collaborativeDocuments.get(documentId);
            if (!document) throw new Error('Document not found');
            
            document.cursors.set(userId, {
                position,
                timestamp: Date.now()
            });
            
            // Broadcast cursor update
            this.broadcastToRoom(document.roomId, 'cursorUpdate', {
                documentId,
                userId,
                position
            }, userId);
            
        } catch (error) {
            console.error('❌ Update cursor error:', error);
            throw error;
        }
    }

    // Whiteboard Collaboration
    async addWhiteboardElement(roomId, userId, element) {
        try {
            const room = this.rooms.get(roomId);
            if (!room) throw new Error('Room not found');
            
            const elementId = crypto.randomUUID();
            const whiteboardElement = {
                id: elementId,
                userId,
                type: element.type, // line, rectangle, circle, text, image
                properties: element.properties,
                position: element.position,
                timestamp: Date.now()
            };
            
            room.state.whiteboard.elements.push(whiteboardElement);
            room.state.whiteboard.version++;
            
            this.broadcastToRoom(roomId, 'whiteboardElementAdded', {
                element: whiteboardElement,
                version: room.state.whiteboard.version
            }, userId);
            
            this.emit('whiteboardUpdated', { roomId, element: whiteboardElement });
            
            return whiteboardElement;
            
        } catch (error) {
            console.error('❌ Add whiteboard element error:', error);
            throw error;
        }
    }

    // File Sharing
    async shareFile(roomId, userId, fileData) {
        try {
            const room = this.rooms.get(roomId);
            if (!room || !room.settings.allowFileShare) {
                throw new Error('File sharing not allowed');
            }
            
            const fileId = crypto.randomUUID();
            const sharedFile = {
                id: fileId,
                userId,
                name: fileData.name,
                size: fileData.size,
                type: fileData.type,
                url: fileData.url || `/files/${fileId}`,
                downloadCount: 0,
                shared: Date.now()
            };
            
            room.state.sharedFiles.push(sharedFile);
            
            this.broadcastToRoom(roomId, 'fileShared', {
                file: sharedFile,
                sharedBy: room.participants.get(userId)?.name
            });
            
            this.emit('fileShared', { roomId, userId, file: sharedFile });
            
            return sharedFile;
            
        } catch (error) {
            console.error('❌ Share file error:', error);
            throw error;
        }
    }

    // Quality Monitoring
    setupQualityMonitoring() {
        setInterval(() => {
            this.monitorConnectionQuality();
        }, 5000); // Every 5 seconds
    }

    monitorConnectionQuality() {
        for (const [roomId, room] of this.rooms.entries()) {
            for (const [userId, participant] of room.participants.entries()) {
                // Simulate quality metrics
                const quality = {
                    latency: Math.floor(Math.random() * 200) + 50, // 50-250ms
                    bandwidth: Math.floor(Math.random() * 5000) + 1000, // 1-6 Mbps
                    packetLoss: Math.random() * 0.05, // 0-5%
                    jitter: Math.random() * 50 // 0-50ms
                };
                
                // Determine quality level
                let qualityLevel = 'excellent';
                if (quality.latency > 150 || quality.packetLoss > 0.02) {
                    qualityLevel = 'good';
                }
                if (quality.latency > 200 || quality.packetLoss > 0.03) {
                    qualityLevel = 'fair';
                }
                if (quality.latency > 250 || quality.packetLoss > 0.05) {
                    qualityLevel = 'poor';
                }
                
                participant.connection = {
                    ...participant.connection,
                    ...quality,
                    quality: qualityLevel
                };
                
                // Emit quality alerts
                if (qualityLevel === 'poor') {
                    this.emit('poorConnectionQuality', {
                        roomId,
                        userId,
                        quality: participant.connection
                    });
                }
            }
        }
    }

    // Utility Functions
    broadcastToRoom(roomId, event, data, excludeUserId = null) {
        const room = this.rooms.get(roomId);
        if (!room) return;
        
        for (const [userId, participant] of room.participants.entries()) {
            if (userId !== excludeUserId && participant.connection.connected) {
                this.emit('messageToUser', {
                    userId,
                    event,
                    data
                });
            }
        }
    }

    generateSDP(type) {
        // Simplified SDP generation
        const sessionId = Date.now();
        const version = Math.floor(Math.random() * 1000000);
        
        return `v=0\r\no=- ${sessionId} ${version} IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\n` +
               `a=group:BUNDLE 0 1\r\na=msid-semantic: WMS\r\n` +
               `m=audio 9 UDP/TLS/RTP/SAVPF 111\r\nc=IN IP4 0.0.0.0\r\n` +
               `a=rtcp:9 IN IP4 0.0.0.0\r\na=ice-ufrag:${crypto.randomBytes(4).toString('hex')}\r\n` +
               `a=ice-pwd:${crypto.randomBytes(12).toString('hex')}\r\n` +
               `a=fingerprint:sha-256 ${crypto.randomBytes(32).toString('hex')}\r\n` +
               `a=setup:${type === 'offer' ? 'actpass' : 'active'}\r\n` +
               `a=mid:0\r\na=sendrecv\r\n`;
    }

    getRoomInfo(roomId) {
        const room = this.rooms.get(roomId);
        if (!room) return null;
        
        return {
            id: room.id,
            type: room.type,
            participantCount: room.participants.size,
            settings: room.settings,
            state: {
                isRecording: room.state.isRecording,
                activeScreenShare: room.state.activeScreenShare,
                chatMessageCount: room.state.chatHistory.length,
                sharedFileCount: room.state.sharedFiles.length
            },
            created: room.created,
            lastActivity: room.lastActivity
        };
    }

    startHeartbeat() {
        setInterval(() => {
            for (const [roomId, room] of this.rooms.entries()) {
                // Clean up inactive rooms
                const inactiveTime = Date.now() - room.lastActivity;
                if (inactiveTime > 24 * 60 * 60 * 1000 && room.participants.size === 0) {
                    this.rooms.delete(roomId);
                    console.log(`🗑️ Cleaned up inactive room: ${roomId}`);
                }
                
                // Update participant last seen
                for (const [userId, participant] of room.participants.entries()) {
                    const lastSeenTime = Date.now() - participant.lastSeen;
                    if (lastSeenTime > 30000) { // 30 seconds
                        participant.connection.connected = false;
                        this.broadcastToRoom(roomId, 'participantDisconnected', {
                            userId,
                            reason: 'timeout'
                        });
                    }
                }
            }
        }, 30000); // Every 30 seconds
    }

    // API Methods
    getRooms() {
        const rooms = [];
        for (const [id, room] of this.rooms.entries()) {
            rooms.push(this.getRoomInfo(id));
        }
        return rooms;
    }

    getRoomParticipants(roomId) {
        const room = this.rooms.get(roomId);
        if (!room) return [];
        
        return Array.from(room.participants.values()).map(p => ({
            id: p.id,
            name: p.name,
            role: p.role,
            media: p.media,
            connection: p.connection,
            joinedAt: p.joinedAt
        }));
    }

    getChatHistory(roomId, limit = 50) {
        const room = this.rooms.get(roomId);
        if (!room) return [];
        
        return room.state.chatHistory.slice(-limit);
    }

    getConnectionStats() {
        const stats = {
            totalRooms: this.rooms.size,
            totalConnections: this.webrtcPeers.size,
            totalParticipants: 0,
            activeStreams: 0
        };
        
        for (const room of this.rooms.values()) {
            stats.totalParticipants += room.participants.size;
            stats.activeStreams += room.mediaStreams.size;
        }
        
        return stats;
    }

    // Shutdown
    shutdown() {
        // Close all peer connections
        for (const peer of this.webrtcPeers.values()) {
            peer.state = 'closed';
        }
        
        // Clear all rooms
        this.rooms.clear();
        
        console.log('🔄 Real-time service shutdown completed');
    }
}

module.exports = AdvancedRealtimeService;