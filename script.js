class ChatApp {
    constructor() {
        this.webhookUrl = 'https://emilianoochoa.app.n8n.cloud/webhook-test/whatsapp-chatbot';
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

    async handleFileSelection(event) {
        const files = Array.from(event.target.files);
        
        for (const file of files) {
            if (!this.selectedFiles.find(f => f.name === file.name && f.size === file.size)) {
                // Check if it's an Excel file
                if (file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || 
                    file.type === 'application/vnd.ms-excel') {
                    try {
                        const sheetNames = await this.getExcelSheetNames(file);
                        file.sheetNames = sheetNames; // Store sheet names in the file object
                    } catch (error) {
                        console.error('Error reading Excel file:', error);
                    }
                }
                this.selectedFiles.push(file);
            }
        }

        this.updateFilePreview();
        this.fileUploadArea.classList.remove('active');
        
        // Clear the input to allow selecting the same file again
        this.fileInput.value = '';
    }

    async getExcelSheetNames(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = function(e) {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const sheetNames = workbook.SheetNames;
                    resolve(sheetNames);
                } catch (error) {
                    reject(error);
                }
            };
            
            reader.onerror = function(error) {
                reject(error);
            };
            
            reader.readAsArrayBuffer(file);
        });
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
            console.error('Error en sendMessage:', error);
            this.addBotResponse({
                success: false,
                message: 'Lo siento, ocurrió un error al procesar tu mensaje.',
                error: `Error de conexión: ${error.message}`,
                timestamp: new Date().toISOString()
            });
        } finally {
            this.hideLoading();
            this.sendButton.disabled = false;
        }
    }

    extractLinksFromMessage(message) {
        // Regular expression to match URLs (http, https, www, or domain.com patterns)
        const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+|[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}[^\s]*)/gi;
        const links = message.match(urlRegex) || [];
        
        // Clean and validate links
        const cleanedLinks = links.map(link => {
            // Add https:// if the link doesn't have a protocol
            if (!link.startsWith('http://') && !link.startsWith('https://')) {
                if (link.startsWith('www.')) {
                    return 'https://' + link;
                } else {
                    // Check if it looks like a domain
                    if (link.includes('.')) {
                        return 'https://' + link;
                    }
                }
            }
            return link;
        }).filter(link => {
            // Basic validation to ensure it's a proper URL
            try {
                new URL(link);
                return true;
            } catch {
                return false;
            }
        });

        return [...new Set(cleanedLinks)]; // Remove duplicates
    }

    async sendToWebhook(message, files) {
        const formData = new FormData();
        
        // Extract links from message
        const extractedLinks = message ? this.extractLinksFromMessage(message) : [];
        
        // Add message
        if (message) {
            formData.append('message', message);
        }
        
        // Add extracted links as separate variables
        if (extractedLinks.length > 0) {
            formData.append('links', JSON.stringify(extractedLinks));
            formData.append('hasLinks', true);
            formData.append('total_links', extractedLinks.length);
            
            // Also add individual links for easier access
            extractedLinks.forEach((link, index) => {
                formData.append(`link_${index}`, link);
            });
            
            console.log('Enlaces extraídos del mensaje:', extractedLinks);
        } else {
            formData.append('hasLinks', false);
            formData.append('total_links', 0);
        }
        
        // Add files
        files.forEach((file, index) => {
            formData.append(`file_${index}`, file);
            formData.append(`file_name_${index}`, file.name);
            
            // Add sheet names if it's an Excel file
            if (file.sheetNames) {
                formData.append(`sheet_names_${index}`, JSON.stringify(file.sheetNames));
            }
        });
        
        // Add metadata
        formData.append('timestamp', new Date().toISOString());
        formData.append('user_id', this.getUserId());
        formData.append('hasFile', files.length > 0);
        formData.append('total_files', files.length);

        console.log('Enviando petición al webhook:', this.webhookUrl);

        const response = await fetch(this.webhookUrl, {
            method: 'POST',
            body: formData
        });

        console.log('Respuesta del webhook - Status:', response.status);
        console.log('Respuesta del webhook - Headers:', Object.fromEntries(response.headers.entries()));

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Error HTTP del webhook:', response.status, errorText);
            throw new Error(`HTTP ${response.status}: ${errorText || response.statusText}`);
        }

        // Get the raw response text first
        const rawText = await response.text();
        console.log('Respuesta raw del webhook:', rawText);

        // Try to parse as JSON, if it fails, return as text
        try {
            const jsonResponse = JSON.parse(rawText);
            console.log('Respuesta JSON parseada:', jsonResponse);
            
            // Handle different possible response formats
            if (typeof jsonResponse === 'string') {
                return { success: true, message: jsonResponse };
            } else if (jsonResponse.message) {
                return jsonResponse;
            } else if (jsonResponse.response) {
                return { success: true, message: jsonResponse.response };
            } else if (jsonResponse.output) {
                return { success: true, message: jsonResponse.output };
            } else if (jsonResponse.text) {
                return { success: true, message: jsonResponse.text };
            } else if (jsonResponse.content) {
                return { success: true, message: jsonResponse.content };
            } else if (jsonResponse.data) {
                return { success: true, message: jsonResponse.data };
            } else {
                // If it's an object but doesn't have expected fields, use it as debug info
                console.warn('Respuesta JSON sin campos reconocidos:', jsonResponse);
                return { 
                    success: false, 
                    message: 'Lo siento, no pude procesar tu mensaje.',
                    error: `Formato de respuesta no reconocido. Respuesta recibida: ${JSON.stringify(jsonResponse)}`,
                    debugInfo: jsonResponse
                };
            }
        } catch (parseError) {
            console.log('No se pudo parsear como JSON, usando como texto:', parseError);
            if (rawText.trim()) {
                return { success: true, message: rawText };
            } else {
                return { 
                    success: false, 
                    message: 'Lo siento, no pude procesar tu mensaje.',
                    error: `Respuesta vacía del webhook. Error de parsing: ${parseError.message}`
                };
            }
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
            
            // Show detected links if user message
            if (sender === 'user') {
                const extractedLinks = this.extractLinksFromMessage(message);
                if (extractedLinks.length > 0) {
                    content += `
                        <div class="detected-links">
                            <small><i class="fas fa-link"></i> Enlaces detectados (${extractedLinks.length}):</small>
                            ${extractedLinks.map(link => `
                                <div class="link-item">
                                    <a href="${link}" target="_blank" rel="noopener noreferrer">
                                        <i class="fas fa-external-link-alt"></i>
                                        ${link.length > 50 ? link.substring(0, 50) + '...' : link}
                                    </a>
                                </div>
                            `).join('')}
                        </div>
                    `;
                }
            }
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
        console.log('Procesando respuesta del bot:', response);
        
        let message = '';
        let errorDetails = '';
        
        if (response.message) {
            message = response.message;
        } else if (typeof response === 'string') {
            message = response;
        } else {
            message = 'Lo siento, no pude procesar tu mensaje.';
            console.error('Respuesta del webhook no tiene formato esperado:', response);
            
            // Create detailed error message for user
            if (response.debugInfo) {
                errorDetails = `Información de debug: ${JSON.stringify(response.debugInfo, null, 2)}`;
            } else if (response.error) {
                errorDetails = response.error;
            } else {
                errorDetails = `Respuesta recibida: ${JSON.stringify(response, null, 2)}`;
            }
        }
        
        const errorReason = response.error || '';
        const formattedMessage = this.formatMarkdown(message);
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message bot-message';
        
        let errorContent = '';
        if (errorReason) {
            errorContent = `
                <div class="error-reason">
                    <strong>Razón del error:</strong> ${errorReason}
                </div>
            `;
        }
        
        // Add detailed error information if available
        if (errorDetails && errorDetails !== errorReason) {
            errorContent += `
                <div class="error-details">
                    <details>
                        <summary>Detalles técnicos del error</summary>
                        <pre style="background: #f5f5f5; padding: 10px; border-radius: 4px; font-size: 12px; overflow-x: auto;">${errorDetails}</pre>
                    </details>
                </div>
            `;
        }
        
        messageDiv.innerHTML = `
            <div class="message-content">
                <div class="message-text">${formattedMessage}</div>
                ${errorContent}
                <div class="message-time">${this.getCurrentTime()}</div>
            </div>
        `;
        this.chatMessages.appendChild(messageDiv);
        this.scrollToBottom();
    }

    formatMarkdown(text) {
        // Reemplazar encabezados (#)
        text = text.replace(/^### (.*$)/gm, '<h3>$1</h3>');
        text = text.replace(/^## (.*$)/gm, '<h2>$1</h2>');
        text = text.replace(/^# (.*$)/gm, '<h1>$1</h1>');

        // Reemplazar negrita (**)
        text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

        // Reemplazar cursiva (*)
        text = text.replace(/\*(.*?)\*/g, '<em>$1</em>');

        // Reemplazar listas con viñetas
        text = text.replace(/^\* (.*$)/gm, '<li>$1</li>');
        text = text.replace(/(<li>.*<\/li>)/g, '<ul>$1</ul>');

        return text;
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