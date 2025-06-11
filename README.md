# AI Chat Assistant 🤖

Un sitio web moderno de chat que se integra con n8n y permite procesar mensajes y archivos con inteligencia artificial.

## 🚀 Características

- **Chat en tiempo real** con interfaz moderna y responsiva
- **Subida de archivos** con drag & drop
- **Integración directa con n8n** via webhook
- **Procesamiento con IA** de mensajes y archivos
- **Vista previa de archivos** con iconos específicos
- **Diseño responsive** para desktop y móvil

## 🎯 Tecnologías

- **HTML5** - Estructura moderna y semántica
- **CSS3** - Estilos con gradientes y animaciones
- **JavaScript ES6+** - Funcionalidad interactiva
- **Font Awesome** - Iconos vectoriales
- **n8n Webhook** - Integración con workflows de IA

## 📦 Instalación

1. Clona este repositorio:
```bash
git clone https://github.com/aeochoa/proyectomarmol33.git
cd proyectomarmol33
```

2. Abre `index.html` en tu navegador, o inicia un servidor local:
```bash
# Con Python
python -m http.server 8000

# Con Node.js
npx http-server
```

3. Accede a `http://localhost:8000`

## 🔧 Configuración

El webhook está configurado para: `https://emilianoochoa.app.n8n.cloud/webhook-test/whatsapp-chatbot`

Para cambiar la URL del webhook, edita el archivo `script.js`:
```javascript
this.webhookUrl = 'TU_WEBHOOK_URL_AQUI';
```

## 📱 Uso

1. **Escribir mensajes**: Escribe en el área de texto y presiona Enter o haz clic en enviar
2. **Subir archivos**: Arrastra archivos al área designada o haz clic en el botón de adjuntar
3. **Procesar con IA**: Los mensajes y archivos se envían automáticamente al webhook de n8n para procesamiento

## 🌐 Estructura del Proyecto

```
proyectomarmol33/
├── index.html          # Página principal del chat
├── styles.css          # Estilos y diseño
├── script.js           # Lógica y funcionalidad
└── README.md           # Documentación
```

## 🔗 API

El sitio envía datos al webhook via POST con FormData:
- `message`: Texto del mensaje
- `file_0`, `file_1`, etc.: Archivos adjuntos
- `timestamp`: Marca de tiempo
- `user_id`: ID único del usuario

## 🤝 Contribuir

1. Haz fork del proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para más detalles.

## 👨‍💻 Autor

**Emiliano Ochoa** - [GitHub](https://github.com/aeochoa)

---

⭐ ¡No olvides dar una estrella si te gustó el proyecto! 