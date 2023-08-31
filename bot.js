
const { Bot, session, MemorySessionStorage, Keyboard, InlineKeyboard, InputFile, InputMediaDocument, InputMediaBuilder } = require("grammy");
const { Menu, MenuRange } = require("@grammyjs/menu");
const { I18n } = require("@grammyjs/i18n");
const {
    conversations,
    createConversation,
} = require("@grammyjs/conversations");
require('dotenv').config()
const Database = require("./db");



const { get_userLang, set_userLang, register_user,check_user } = require("./controllers/userController");
const customLogger = require("./config/customLogger");
const { log } = require("winston");


const bot_token = process.env.BOT_TOKEN;
const payme_tokent = process.env.PAYME_PROVIDER_TOKEN;


const admin_id = 12312123;
const connect_phone = '+998(97) 771-60-04'








const bot = new Bot(bot_token);


bot.use(session({
    type: "multi",
    session_db: {
        initial: () => {
            return {
                client: {
                    phone: null,
                    full_name: null,
                }
            }
        },
        storage: new MemorySessionStorage(),
    },
    conversation: {},
    __language_code: {},
}));

const i18n = new I18n({
    defaultLocale: "uz",
    useSession: true,
    directory: "locales",
    globalTranslationContext(ctx) {
        return { first_name: ctx.from?.first_name ?? "" };
    },
});
bot.use(i18n);





bot.use(conversations());

bot.on("my_chat_member", async (ctx) => {
    if (ctx.update.my_chat_member.new_chat_member.status == "kicked") {
        const stats = await ctx.conversation.active();
        for (let key of Object.keys(stats)) {
            await ctx.conversation.exit(key);
        }

        // let data = {
        //     user_id: ctx.from.id,
        //     firstname: ctx.from.first_name,
        //     username: ctx.from.username || null,
        // }

        // await removeUser(data, ctx)
    }
});

bot.use(async (ctx, next) => {
    let commands_list = []
    if (commands_list.includes(ctx.message?.text)) {
        const stats = await ctx.conversation.active();
        for (let key of Object.keys(stats)) {
            await ctx.conversation.exit(key);
        }
    }
    await next()

})



bot.use(createConversation(main_menu_conversation));
bot.use(createConversation(register_user_conversation));




















const pm = bot.chatType("private");




const check_phone_number = (msg, conversation) => {
    if (msg?.contact) {
        conversation.session.session_db.client.phone = msg.contact.phone_number
        return false
    } else {
        let reg = new RegExp('^[012345789][0-9]{8}$');
        conversation.session.session_db.client.phone = reg.test(msg.text) ? "998"+msg.text : null;
        return !reg.test(msg.text)
    }

}


async function register_user_conversation(conversation, ctx) {
    const user_phone_menu = new Keyboard()
        .requestContact(ctx.t("phone_btn_text"))
        .resized();
    await ctx.reply(ctx.t("register_phone_text"), {
        parse_mode: "HTML",
        reply_markup: user_phone_menu
    })

    ctx = await conversation.wait();
    if (check_phone_number(ctx.message, conversation)) {
        do {
            await ctx.reply(ctx.t("invalid_phone_text"), {
                parse_mode: "HTML",
            });
            ctx = await conversation.wait();
        } while (check_phone_number(ctx.message, conversation));
    }

    await ctx.reply(ctx.t("register_fullName_text"), {
        reply_markup:{
            remove_keyboard:true
        }
    });
    ctx = await conversation.wait();
    if (!ctx.message?.text) {
        do {
            await ctx.reply(ctx.t("invalid_fullName_text"), {
                parse_mode: "HTML",
            });
            ctx = await conversation.wait();
        } while (!ctx.message?.text);
    }

    conversation.session.session_db.client.full_name = ctx.message.text;
    let language = await ctx.i18n.getLocale();

    data ={
        phone:conversation.session.session_db.client.phone,
        full_name:conversation.session.session_db.client.full_name,
        user_id: ctx.from.id,
        first_name: ctx.from.first_name,
        username: ctx.from.username || null,
        lang: language,
        active_user:true
    }
    
    await register_user(data);
    await ctx.reply(ctx.t("success_register_text"))


}

async function main_menu_conversation(conversation, ctx){
   
    let main_menu = new Keyboard()
    .text(ctx.t("product_text"))
    .row()
    .text(ctx.t("my_order_text"))
    .text(ctx.t("feedback_menu_text"))
    .row()
    .text(ctx.t("about_menu_text"))
    .text(ctx.t("setting_menu_text"))
    .resized()

    await ctx.reply(ctx.t("main_menu_title"), {
        reply_markup:main_menu
    });

}

// language menu
const language_menu = new Menu("language_menu")
    .dynamic(async (ctx, range) => {
        let list = [{
            name: "language_uz",
            key: "uz"
        },
        {
            name: "language_ru",
            key: "ru"
        }

        ]
        list.forEach((item) => {
            range
                .text(ctx.t(item.name), async (ctx) => {
                    await ctx.answerCallbackQuery();
                    await ctx.i18n.setLocale(item.key);
                    data = {
                        user_id: ctx.from.id,
                        lang: item.key
                    }
                    await set_userLang(data);
                    await ctx.deleteMessage();
                    await ctx.conversation.enter("register_user_conversation");
                })
                .row();
        })
    })
pm.use(language_menu)



pm.command("start", async (ctx) => {
    let user_id = ctx.from.id;
    let user = await check_user(user_id);
    if(user){
        await ctx.conversation.enter("main_menu_conversation");

    }else{
        await ctx.reply(ctx.t("start_text"), {
            parse_mode: "HTML",
            reply_markup: language_menu
        })
    }
    
   
})



















































bot.catch((err) => {
    const ctx = err.ctx;
    console.error(`Error while handling update ${ctx.update.update_id}:`);
    const message = err.error;
    customLogger.log({
        level: 'error',
        message: message
    });
});



bot.start();