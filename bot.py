import logging
from telegram import Update, WebAppInfo, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import ApplicationBuilder, ContextTypes, CommandHandler

# Configura tu TOKEN aquí
# TOKEN proporcionado por el usuario
TOKEN = "8322614741:AAGJLpJ5JALF3JblUXRp-CBid14NRDM1TS8" 

# Configura la URL de tu aplicación (debe ser HTTPS)
# Si estás probando localmente, usa algo como Ngrok para obtener una URL HTTPS
# URL de tu aplicación en GitHub Pages (Actualizada para web-hosting)
WEB_APP_URL = "https://mdnxzzzz.github.io/VaultMusic-bot-web-hosting/" 

logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO
)

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Envia un mensaje con el botón para abrir la Web App."""
    keyboard = [
        [
            InlineKeyboardButton(
                "🎵 Abrir VaultMusic Player", 
                web_app=WebAppInfo(url=WEB_APP_URL)
            )
        ]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)
    
    user_name = update.effective_user.first_name
    await update.message.reply_text(
        f"¡Hola <b>{user_name}</b>! 👋\n\n"
        "Bienvenido a <b>VaultMusic</b>, tu reproductor de música premium.\n\n"
        "Pulsa el botón de abajo para explorar nuestra biblioteca y escuchar tus temas favoritos:",
        reply_markup=reply_markup,
        parse_mode='HTML'
    )

if __name__ == '__main__':
    application = ApplicationBuilder().token(TOKEN).build()
    
    start_handler = CommandHandler('start', start)
    application.add_handler(start_handler)
    
    print("VaultMusic Bot iniciado...")
    application.run_polling()
