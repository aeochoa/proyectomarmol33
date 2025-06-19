class ChatApp {
    constructor() {
        this.webhookUrl = 'https://emilianoochoa.app.n8n.cloud/webhook-test/whatsapp-chatbot';
        this.googleSheetsUrl = 'https://script.google.com/macros/s/AKfycbxmXrGsQovpa7lX8dDR2Hm7XbE2B0owCR8ho9p0W1prnNqa-pEmrq1pqJGwKsJlXqlQ2w/exec'; // Google Apps Script directo
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

        // Guardar mensaje del usuario en Google Sheets
        await this.saveMessageToGoogleSheets(message, filesToSend, 'user');

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
            
            // Guardar respuesta del bot en Google Sheets
            let botMessage = '';
            if (response.message) {
                botMessage = response.message;
            } else if (typeof response === 'string') {
                botMessage = response;
            }
            
            if (botMessage) {
                await this.saveMessageToGoogleSheets('', [], 'bot', botMessage);
            }
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

    async saveMessageToGoogleSheets(message, files, sender, botResponse = null) {
        try {
            const payload = {
                timestamp: new Date().toISOString(),
                date: new Date().toLocaleDateString('es-CO'),
                time: new Date().toLocaleTimeString('es-CO'),
                user_id: this.getUserId(),
                sender: sender, // 'user' or 'bot'
                message: message || '',
                has_files: files ? files.length > 0 : false,
                files_count: files ? files.length : 0,
                file_names: files && files.length > 0 ? files.map(f => f.name).join(', ') : '',
                bot_response: botResponse || '',
                session_id: this.getSessionId()
            };

            console.log('🔍 Intentando guardar mensaje en Google Sheets:', payload);
            console.log('🌐 URL destino:', this.googleSheetsUrl);

            const response = await fetch(this.googleSheetsUrl, {
                method: 'POST',
                mode: 'no-cors', // Agregar modo no-cors para evitar problemas de CORS
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload)
            });

            console.log('📡 Respuesta recibida - Status:', response.status);
            console.log('📡 Respuesta recibida - Type:', response.type);
            
            // Con no-cors, response.ok siempre será false, pero si no hay error de red, funcionó
            if (response.type === 'opaque') {
                console.log('✅ Mensaje enviado a Google Sheets (modo no-cors)');
            } else if (response.ok) {
                console.log('✅ Mensaje guardado exitosamente en Google Sheets');
                const responseText = await response.text();
                console.log('📄 Respuesta:', responseText);
            } else {
                console.error('❌ Error al guardar en Google Sheets:', response.status, response.statusText);
                const errorText = await response.text();
                console.error('📄 Error details:', errorText);
            }
        } catch (error) {
            console.error('❌ Error completo al guardar mensaje en Google Sheets:', error);
            console.error('📍 Error name:', error.name);
            console.error('📍 Error message:', error.message);
            console.error('📍 Error stack:', error.stack);
            // No mostramos error al usuario para no interrumpir la experiencia del chat
        }
    }

    getSessionId() {
        let sessionId = sessionStorage.getItem('chat_session_id');
        if (!sessionId) {
            sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            sessionStorage.setItem('chat_session_id', sessionId);
        }
        return sessionId;
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
        const formattedMessage = this.formatHTML(message);
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

    formatHTML(text) {
        // Clean up common AI response patterns
        text = text.trim();
        
        // Detect and reject programming code responses
        const codePatterns = [
            /\$\w+\s*=\s*/, // PHP variables
            /<\?php/i, // PHP opening tags
            /\?>/i, // PHP closing tags
            /function\s*\(/i, // Function declarations
            /if\s*\(/i, // If statements
            /for\s*\(/i, // For loops
            /while\s*\(/i, // While loops
            /console\.log/i, // JavaScript console
            /def\s+\w+\s*\(/i, // Python functions
            /import\s+\w+/i, // Import statements
        ];
        
        // Detect placeholder values (fake data)
        const placeholderPatterns = [
            /\$X,XXX\.XX/gi, // $X,XXX.XX
            /\$XXX\.XX/gi, // $XXX.XX (but not $123.45)
            /\$X+[,.]X+/gi, // $XXXX.XX, etc. but not real numbers
            /\[valor\]/gi, // [valor]
            /\[cantidad\]/gi, // [cantidad]
            /\[dato\]/gi, // [dato]
        ];
        
        // More specific detection - avoid false positives
        const hasRealPlaceholders = text.match(/\$X,XXX\.XX/gi) || 
                                   text.match(/\$XXX\.XX/gi) ||
                                   text.match(/\$X{3,}/gi) || // Multiple X's
                                   text.match(/\[valor\]/gi) ||
                                   text.match(/\[cantidad\]/gi) ||
                                   text.match(/\[dato\]/gi);
        
        // Don't flag legitimate $0.00 or real currency values
        const hasRealCurrency = text.match(/\$\d+\.\d{2}/g);
        
        // Count how many real currency values vs placeholders
        const realCurrencyCount = (text.match(/\$\d+,?\d*\.\d{2}/g) || []).length;
        const placeholderCount = (text.match(/\$X+,?X*\.X+/gi) || []).length;
        
        // Check if response contains programming code
        const containsCode = codePatterns.some(pattern => pattern.test(text));
        
        // Only flag as placeholder if:
        // 1. Has placeholders AND
        // 2. Has few or no real currency values OR placeholder count > real currency count
        const containsPlaceholders = hasRealPlaceholders && 
                                   (realCurrencyCount === 0 || placeholderCount > realCurrencyCount * 0.1);
        
        if (containsCode) {
            // Return a user-friendly message instead of code
            return `
                <div style="padding: 16px; background: rgba(255, 107, 107, 0.1); border-left: 4px solid #ff6b6b; border-radius: 8px;">
                    <strong>⚠️ Error de Formato</strong><br>
                    La IA respondió con código de programación en lugar de análisis de datos.<br>
                    <small>Por favor, reformula tu pregunta pidiendo específicamente un análisis visual de los datos.</small>
                </div>
            `;
        }
        
        if (containsPlaceholders) {
            // Return a message indicating fake data was detected
            return `
                <div style="padding: 16px; background: rgba(255, 193, 7, 0.1); border-left: 4px solid #ffc107; border-radius: 8px;">
                    <strong>📊 Datos Faltantes</strong><br>
                    La IA respondió con valores de ejemplo (como $X,XXX.XX) en lugar de datos reales.<br>
                    <small>Para obtener un análisis preciso, necesitas subir los archivos de Excel con los datos específicos de costos y ventas.</small>
                </div>
            `;
        }
        
        // If has some placeholders but mostly real data, process it but add a warning
        if (hasRealPlaceholders && realCurrencyCount > 0) {
            text = text.replace(/\$X+,?X*\.X+/gi, '<span style="background: yellow; padding: 2px 4px; border-radius: 3px;">⚠️ CÁLCULO PENDIENTE</span>');
        }
        
        // Remove common HTML wrapper patterns that AIs might add
        // Handle various quote patterns: '''html, ```html, "html, 'html
        if (text.match(/^['"`]{1,3}html/i)) {
            text = text.replace(/^['"`]{1,3}html['"` \n\r]*/i, '');
        }
        
        // Remove ending quotes/backticks
        if (text.match(/['"`]{1,3}$/)) {
            text = text.replace(/['"`]{1,3}$/g, '');
        }
        
        // Remove markdown code block markers at start
        if (text.startsWith('```')) {
            text = text.replace(/^```[a-z]*\n?/i, '');
        }
        
        // Remove markdown code block markers at end
        if (text.endsWith('```')) {
            text = text.replace(/```$/g, '');
        }
        
        // Remove quotes at the beginning and end if they wrap the entire content
        text = text.trim();
        if ((text.startsWith('"') && text.endsWith('"')) || 
            (text.startsWith("'") && text.endsWith("'")) ||
            (text.startsWith("`") && text.endsWith("`"))) {
            text = text.slice(1, -1);
        }
        
        // Clean up any remaining wrapper patterns
        text = text.replace(/^html\s*/i, ''); // Remove standalone "html" at start
        text = text.trim();
        
        // First, handle line breaks - convert \n to <br> if not already HTML
        if (!text.includes('<') && text.includes('\n')) {
            text = text.replace(/\n/g, '<br>');
        }
        
        // Convert markdown-style formatting to HTML if not already in HTML
        if (!text.includes('<table') && !text.includes('<ul') && !text.includes('<ol')) {
            // Convert markdown headers to HTML if they exist
            text = text.replace(/^### (.*$)/gm, '<h3>$1</h3>');
            text = text.replace(/^## (.*$)/gm, '<h2>$1</h2>');
            text = text.replace(/^# (.*$)/gm, '<h1>$1</h1>');

            // Convert markdown bold and italic
            text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
            text = text.replace(/\*(.*?)\*/g, '<em>$1</em>');

            // Convert markdown lists to HTML
            text = text.replace(/^\* (.*$)/gm, '<li>$1</li>');
            text = text.replace(/^- (.*$)/gm, '<li>$1</li>');
            
            // Wrap consecutive <li> elements in <ul>
            text = text.replace(/(<li>.*?<\/li>)(\s*<li>.*?<\/li>)*/gs, function(match) {
                return '<ul>' + match + '</ul>';
            });
        }
        
        // Clean up any potential XSS while preserving safe HTML
        const allowedTags = [
            'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
            'p', 'br', 'strong', 'b', 'em', 'i', 'u',
            'ul', 'ol', 'li',
            'table', 'thead', 'tbody', 'tr', 'th', 'td',
            'div', 'span', 'blockquote',
            'code', 'pre'
        ];
        
        // Create a temporary div to safely parse HTML
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = text;
        
        // Remove any script tags or dangerous attributes
        const scripts = tempDiv.querySelectorAll('script');
        scripts.forEach(script => script.remove());
        
        // Remove dangerous attributes
        const allElements = tempDiv.querySelectorAll('*');
        allElements.forEach(element => {
            const attrs = element.attributes;
            for (let i = attrs.length - 1; i >= 0; i--) {
                const attr = attrs[i];
                if (attr.name.startsWith('on') || attr.name === 'javascript:') {
                    element.removeAttribute(attr.name);
                }
            }
        });
        
        return tempDiv.innerHTML;
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

function detectMathErrors(text) {
    const mathErrors = [];
    
    // Buscar patrones de cálculos comunes que pueden estar mal
    const multiplicationPattern = /\$?([\d,]+\.?\d*)\s*[×x*]\s*([\d,]+\.?\d*)\s*=\s*\$?([\d,]+\.?\d*)/gi;
    
    let match;
    while ((match = multiplicationPattern.exec(text)) !== null) {
        const num1 = parseFloat(match[1].replace(/,/g, ''));
        const num2 = parseFloat(match[2].replace(/,/g, ''));
        const claimed = parseFloat(match[3].replace(/,/g, ''));
        const actual = num1 * num2;
        
        if (Math.abs(actual - claimed) > 0.01) {
            mathErrors.push({
                operation: `${num1} × ${num2}`,
                claimed: claimed,
                actual: actual.toFixed(2),
                error: `Calculó ${claimed}, debería ser ${actual.toFixed(2)}`
            });
        }
    }
    
    return mathErrors;
}

function showMathErrorWarning(errors) {
    if (errors.length === 0) return '';
    
    let warningHtml = '<div class="math-error-warning">';
    warningHtml += '<h4>⚠️ Errores Matemáticos Detectados:</h4>';
    warningHtml += '<ul>';
    
    errors.forEach(error => {
        warningHtml += `<li><strong>${error.operation}</strong>: ${error.error}</li>`;
    });
    
    warningHtml += '</ul>';
    warningHtml += '<p><em>Considera verificar estos cálculos con la IA.</em></p>';
    warningHtml += '</div>';
    
    return warningHtml;
}

function displayMessage(message, isUser, hasLinks = false, detectedLinks = []) {
    // ... existing code ...
    
    if (!isUser) {
        // Detectar errores matemáticos en respuestas de IA
        const mathErrors = detectMathErrors(message);
        if (mathErrors.length > 0) {
            messageElement.innerHTML += showMathErrorWarning(mathErrors);
        }
    }
    
    // ... existing code ...
} 