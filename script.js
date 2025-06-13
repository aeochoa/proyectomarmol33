class ChatApp {
    constructor() {
        this.webhookUrl = 'https://emilianoochoa.app.n8n.cloud/webhook-test/199ffb4d-2fb1-441f-b940-685714d26c0f';
        this.selectedFiles = [];
        this.initializeElements();
        this.attachEventListeners();
        this.autoResizeTextarea();
    }

    initializeElements() {
        this.chatMessages = document.getElementById('chatMessages');
        this.messageInput = document.getElementById('messageInput');
        this.sendButton = document.getElementById('sendButton');
        this.fileButton = document.getElementById('fileButton');
        this.fileInput = document.getElementById('fileInput');
        this.fileUploadArea = document.getElementById('fileUploadArea');
        this.filePreview = document.getElementById('filePreview');
        this.loadingOverlay = document.getElementById('loadingOverlay');
    }

    attachEventListeners() {
        // Send message events
        this.sendButton.addEventListener('click', () => this.sendMessage());
        this.messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        // File upload events
        this.fileButton.addEventListener('click', () => {
            this.fileUploadArea.classList.toggle('active');
        });

        this.fileInput.addEventListener('change', (e) => this.handleFileSelection(e));
        
        this.fileUploadArea.addEventListener('click', () => {
            this.fileInput.click();
        });

        // Drag and drop events
        this.fileUploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            this.fileUploadArea.style.borderColor = '#A855F7';
            this.fileUploadArea.style.background = 'rgba(168, 85, 247, 0.15)';
        });

        this.fileUploadArea.addEventListener('dragleave', (e) => {
            e.preventDefault();
            this.fileUploadArea.style.borderColor = '#A855F7';
            this.fileUploadArea.style.background = 'rgba(168, 85, 247, 0.05)';
        });

        this.fileUploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            this.fileUploadArea.style.borderColor = '#A855F7';
            this.fileUploadArea.style.background = 'rgba(168, 85, 247, 0.05)';
            this.handleFileSelection({ target: { files: e.dataTransfer.files } });
        });

        // Auto-resize textarea
        this.messageInput.addEventListener('input', () => this.autoResizeTextarea());
    }

    autoResizeTextarea() {
        this.messageInput.style.height = 'auto';
        this.messageInput.style.height = Math.min(this.messageInput.scrollHeight, 120) + 'px';
    }

    handleFileSelection(event) {
        const files = Array.from(event.target.files);
        
        files.forEach(file => {
            if (!this.selectedFiles.find(f => f.name === file.name && f.size === file.size)) {
                this.selectedFiles.push(file);
            }
        });

        this.updateFilePreview();
        this.fileUploadArea.classList.remove('active');
        
        // Clear the input to allow selecting the same file again
        this.fileInput.value = '';
    }

    updateFilePreview() {
        this.filePreview.innerHTML = '';
        
        this.selectedFiles.forEach((file, index) => {
            const fileItem = document.createElement('div');
            fileItem.className = 'file-item';
            
            const fileIcon = this.getFileIcon(file.type);
            const fileName = file.name.length > 20 ? 
                file.name.substring(0, 20) + '...' : file.name;
            
            fileItem.innerHTML = `
                <i class="fas ${fileIcon}"></i>
                <span>${fileName}</span>
                <button class="file-remove" onclick="chatApp.removeFile(${index})">
                    <i class="fas fa-times"></i>
                </button>
            `;
            
            this.filePreview.appendChild(fileItem);
        });
    }

    removeFile(index) {
        this.selectedFiles.splice(index, 1);
        this.updateFilePreview();
    }

    getFileIcon(fileType) {
        const iconMap = {
            'image/': 'fa-image',
            'video/': 'fa-video',
            'audio/': 'fa-music',
            'application/pdf': 'fa-file-pdf',
            'application/msword': 'fa-file-word',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'fa-file-word',
            'application/vnd.ms-excel': 'fa-file-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'fa-file-excel',
            'application/vnd.ms-powerpoint': 'fa-file-powerpoint',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'fa-file-powerpoint',
            'text/': 'fa-file-alt',
            'application/zip': 'fa-file-archive',
            'application/x-rar-compressed': 'fa-file-archive'
        };

        for (const [type, icon] of Object.entries(iconMap)) {
            if (fileType.startsWith(type) || fileType === type) {
                return icon;
            }
        }
        
        return 'fa-file';
    }

    async sendMessage() {
        const message = this.messageInput.value.trim();
        
        if (!message && this.selectedFiles.length === 0) {
            return;
        }

        // Disable send button
        this.sendButton.disabled = true;

        // GUARDAR los archivos antes de limpiar
        const filesToSend = [...this.selectedFiles];
        
        // Add user message to chat
        this.addMessageToChat(message, this.selectedFiles, 'user');

        // Clear inputs DESPUÉS de guardar
        this.messageInput.value = '';
        this.selectedFiles = [];
        this.updateFilePreview();
        this.autoResizeTextarea();

        // Show loading
        this.showLoading();

        try {
            // Send to webhook con los archivos guardados
            const response = await this.sendToWebhook(message, filesToSend);
            
            // Add bot response
            this.addBotResponse(response);
        } catch (error) {
            this.addBotResponse({
                success: false,
                message: 'Lo siento, ocurrió un error al procesar tu mensaje. Por favor intenta de nuevo.'
            });
        } finally {
            this.hideLoading();
            this.sendButton.disabled = false;
        }
    }

    async sendToWebhook(message, files) {
        const formData = new FormData();
        
        // Add message
        if (message) {
            formData.append('message', message);
        }
        
        // Add files
        files.forEach((file, index) => {
            formData.append(`file_${index}`, file);
        });
        
        // Add metadata
        formData.append('timestamp', new Date().toISOString());
        formData.append('user_id', this.getUserId());

        const response = await fetch(this.webhookUrl, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        // Try to parse as JSON, if it fails, return as text
        try {
            const jsonResponse = await response.json();
            return jsonResponse;
        } catch {
            const text = await response.text();
            return { success: true, message: text };
        }
    }

    getUserId() {
        let userId = localStorage.getItem('chat_user_id');
        if (!userId) {
            userId = 'user_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('chat_user_id', userId);
        }
        return userId;
    }

    addMessageToChat(message, files, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}-message`;
        
        const avatarDiv = document.createElement('div');
        avatarDiv.className = 'message-avatar';
        avatarDiv.innerHTML = sender === 'user' ? 
            '<i class="fas fa-user"></i>' : 
            `<div class="avatar-logo">
                <img src="https://ik.imagekit.io/1vwnxv8bn/Dise%C3%B1o%20sin%20t%C3%ADtulo.png?updatedAt=1749682949597" alt="Manuable" class="avatar-logo-img"/>
            </div>`;
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        
        let content = '';
        
        if (message) {
            content += `<p>${this.escapeHtml(message)}</p>`;
        }
        
        if (files && files.length > 0) {
            files.forEach(file => {
                const fileIcon = this.getFileIcon(file.type);
                content += `
                    <div class="file-attachment">
                        <i class="fas ${fileIcon}"></i>
                        <span>${this.escapeHtml(file.name)}</span>
                        <small>(${this.formatFileSize(file.size)})</small>
                    </div>
                `;
            });
        }
        
        content += `<span class="message-time">${this.getCurrentTime()}</span>`;
        contentDiv.innerHTML = content;
        
        messageDiv.appendChild(avatarDiv);
        messageDiv.appendChild(contentDiv);
        
        this.chatMessages.appendChild(messageDiv);
        this.scrollToBottom();
    }

    addBotResponse(response) {
        let message = '';
        
        if (response && typeof response === 'object') {
            if (response.message) {
                message = response.message;
            } else if (response.response) {
                message = response.response;
            } else if (response.text) {
                message = response.text;
            } else if (response.aiResponse) {
                message = response.aiResponse;
            } else if (response.finalResponse) {
                message = response.finalResponse;
            } else if (response.output) {
                message = response.output;
            } else if (response.content) {
                message = response.content;
            } else if (response.success === false && response.error) {
                message = 'Error: ' + response.error;
            } else {
                message = JSON.stringify(response, null, 2);
            }
        } else if (typeof response === 'string') {
            message = response;
        } else {
            message = 'Respuesta recibida del servidor.';
        }

        this.addMessageToChat(message, [], 'bot');
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    getCurrentTime() {
        return new Date().toLocaleTimeString('es-ES', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    }

    scrollToBottom() {
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }

    showLoading() {
        this.loadingOverlay.classList.add('active');
    }

    hideLoading() {
        this.loadingOverlay.classList.remove('active');
    }
}

// Initialize the chat app when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.chatApp = new ChatApp();
});

// Handle page visibility changes to maintain connection
document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
        // Eliminar log de la terminal
    }
}); 