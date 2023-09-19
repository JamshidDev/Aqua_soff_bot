
const { Bot, session, MemorySessionStorage, Keyboard, InlineKeyboard, InputFile, InputMediaDocument, InputMediaBuilder } = require("grammy");
const { Menu, MenuRange } = require("@grammyjs/menu");
const { I18n, hears } = require("@grammyjs/i18n");
const {
    conversations,
    createConversation,
} = require("@grammyjs/conversations");
require('dotenv').config()
const Database = require("./db");
const { limit } = require("@grammyjs/ratelimiter");
const { autoRetry } = require("@grammyjs/auto-retry");

const { add_order, payment_message_id, my_orders, active_orders, statistic_daily, general_statistic, check_payemt_order, update_order_payment, get_order_by_msgId, rejected_order, check_delivered_order } = require("./controllers/orderController")
const { get_categories } = require("./controllers/categoryController")
const { get_userLang, get_active_user_list, set_userLang, register_user, check_user, change_user_fullname, change_user_phone_number, remove_user } = require("./controllers/userController");
const { add_payment_histry } = require("./controllers/paymentControllers")
const customLogger = require("./config/customLogger");
const { log } = require("winston");



const bot_token = process.env.BOT_TOKEN;
const payme_tokent = process.env.PAYME_PROVIDER_TOKEN;


const admin_id = 5604998397;
const connect_phone = '+998(97) 776-17-17'








const bot = new Bot(bot_token);









bot.on(":successful_payment", async (ctx) => {
    await ctx.deleteMessage()
    let order_id = ctx.msg.successful_payment.invoice_payload;
    let order_price = ctx.msg.successful_payment.total_amount;


    let order = await update_order_payment(order_id)
    let data = {
        client_id: ctx.from.id,
        order_id: ctx.msg.successful_payment.invoice_payload,
        payment_amount: ctx.msg.successful_payment.total_amount / 100,
        payment_details: ctx.msg.successful_payment
    }
    await add_payment_histry(data)
    await ctx.reply(ctx.t("successfully_payment_text", {
        order_number: order.order_number,
        order_price: order_price / 100,
        payment_date: new Date().toLocaleString(),
    }))
    await ctx.api.sendMessage(admin_id, `<b>💰 To'lov amalga oshirildi</b>
🔰 Buyurtma raqami: <b>${order.order_number}</b>  
💵 To'langan summa: <b>${order_price}</b> so'm `, {
        parse_mode: "HTML"
    })
})


bot.on("pre_checkout_query", async (ctx) => {
    let pre_checkout_query_id = ctx.update.pre_checkout_query.id;
    let order_id = ctx.update.pre_checkout_query.invoice_payload;
    let order = await check_payemt_order(order_id);
    if (order.length == 1) {
        await ctx.api.answerPreCheckoutQuery(pre_checkout_query_id, true);
    } else {
        await ctx.api.answerPreCheckoutQuery(pre_checkout_query_id, false, {
            error_message: "Buyurtmaga to'lov qilish cheklangan"
        });
    }
})





bot.use(session({
    type: "multi",
    session_db: {
        initial: () => {
            return {
                client: {
                    phone: null,
                    full_name: null,
                },
                order_detail: {
                    category_id: null,
                    order_amout: null,
                    delivery_location: null,

                },
                selected_order: null,

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

bot.api.config.use(autoRetry({
    maxRetryAttempts: 1, // only repeat requests once
    maxDelaySeconds: 5, // fail immediately if we have to wait >5 seconds
}));


bot.use(
    limit({
        // Allow only 3 messages to be handled every 2 seconds.
        timeFrame: 2000,
        limit: 3,

        // "MEMORY_STORE" is the default value. If you do not want to use Redis, do not pass storageClient at all.
        //   storageClient: MEMORY_STORE,

        // This is called when the limit is exceeded.
        onLimitExceeded: async (ctx) => {
            await ctx.reply(ctx.t("many_request_text"));
        },

        // Note that the key should be a number in string format such as "123456789".
        keyGenerator: (ctx) => {
            return ctx.from?.id.toString();
        },
    })
);


bot.use(conversations());

bot.on("my_chat_member", async (ctx) => {
    if (ctx.update.my_chat_member.new_chat_member.status == "kicked") {
        await remove_user(ctx.from.id)
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
    let commands_list = [ctx.t("cancel_action_text"), ctx.t("back_to_btn_menu"),]
    if (commands_list.includes(ctx.message?.text)) {
        const stats = await ctx.conversation.active();
        for (let key of Object.keys(stats)) {
            await ctx.conversation.exit(key);
        }
    }
    ctx.config = {
        is_admin: ctx.from?.id == admin_id
    }
    await next()

})




// payment menu
const payment_types_btn_menu = new Menu("payment_types_btn_menu")
    .dynamic(async (ctx, range) => {
        let list = [{
            name: "payme_pay_menu_text",
            key: "payme"
        },
            // {
            //     name: "click_pay_menu_text",
            //     key: "click"
            // }

        ]
        list.forEach((item) => {
            range
                .text(ctx.t(item.name), async (ctx) => {
                    await ctx.answerCallbackQuery();
                    let order = await get_order_by_msgId(ctx.msg.message_id);

                    if (order) {

                        // payment details
                        let order_price = order.order_amount * order.category_id.price;


                        let chat_id = ctx.from.id;
                        let title = ctx.t("payment_title_text", {
                            order_number: order.order_number,
                            order_type: order.category_id.name
                        });
                        let description = ctx.t("payment_details_text", {
                            order_number: order.order_number
                        });
                        let payload = order._id;
                        let provider_token = payme_tokent;
                        let currency = "UZS";
                        let prices = [{
                            label: "UZS",
                            amount: order_price * 100
                        }]
                        let payment = await ctx.api.sendInvoice(
                            chat_id,
                            title,
                            description,
                            payload,
                            provider_token,
                            currency,
                            prices,
                        );
                    } else {
                        await ctx.reply(ctx.t("order_payment_status_text"), {
                            parse_mode: "HTML"
                        })
                    }
                    // console.log(order);


                })
                .row();
        })
    })
bot.use(payment_types_btn_menu)



bot.use(createConversation(main_menu_conversation));
bot.use(createConversation(register_user_conversation));
bot.use(createConversation(change_fullname_conversation));
bot.use(createConversation(change_phone_number_conversation));
bot.use(createConversation(user_feedback_conversation));
bot.use(createConversation(order_product_conversation));
bot.use(createConversation(admin_main_menu_conversation));
bot.use(createConversation(send_message_conversation));




















const pm = bot.chatType("private");




const check_phone_number = (msg, conversation) => {
    if (msg?.contact) {
        conversation.session.session_db.client.phone = msg.contact.phone_number
        return false
    } else {
        let reg = new RegExp('^[012345789][0-9]{8}$');
        conversation.session.session_db.client.phone = reg.test(msg.text) ? "+998" + msg.text : null;
        return !reg.test(msg.text)
    }

}

const check_number = (msg) => {
    if (msg?.text) {
        return isNaN(+msg.text)
    } else {
        return true
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
        reply_markup: {
            remove_keyboard: true
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

    data = {
        phone: conversation.session.session_db.client.phone,
        full_name: conversation.session.session_db.client.full_name,
        user_id: ctx.from.id,
        first_name: ctx.from.first_name,
        username: ctx.from.username || null,
        lang: language,
        active_user: true
    }

    await register_user(data);
    await ctx.reply(ctx.t("success_register_text"));
    if (ctx.config.is_admin) {
        await ctx.conversation.enter("admin_main_menu_conversation");
    } else {
        await ctx.conversation.enter("main_menu_conversation");
    }


}

async function main_menu_conversation(conversation, ctx) {

    let main_menu = new Keyboard()
        .text(ctx.t("product_text"))
        .row()
        .text(ctx.t("my_order_text"))
        .text(ctx.t("feedback_menu_text"))
        .row()
        .text(ctx.t("gift_menu_text"))
        .text(ctx.t("call_center_menu_text"))
        .row()
        .text(ctx.t("about_menu_text"))
        .text(ctx.t("setting_menu_text"))
        .resized()

    await ctx.reply(ctx.t("main_menu_title"), {
        reply_markup: main_menu
    });

}

async function change_fullname_conversation(conversation, ctx) {
    let cancel_keyboard = new Keyboard()
        .text(ctx.t("cancel_action_text"))
        .resized();
    await ctx.reply(ctx.t("register_fullName_text"), {
        reply_markup: cancel_keyboard
    })
    ctx = await conversation.wait();
    if (!ctx.message?.text) {
        do {
            await ctx.reply(ctx.t("invalid_fullName_text"), {
                parse_mode: "HTML",
            });
            ctx = await conversation.wait();
        } while (!ctx.message?.text);
    }
    let data = {
        user_id: ctx.from.id,
        full_name: ctx.message.text
    }
    await change_user_fullname(data);
    await ctx.reply(ctx.t("success_done_action"));
    await ctx.conversation.enter("main_menu_conversation");
}

async function change_phone_number_conversation(conversation, ctx) {
    let cancel_keyboard = new Keyboard()
        .requestContact(ctx.t("phone_btn_text"))
        .row()
        .text(ctx.t("cancel_action_text"))
        .resized();
    await ctx.reply(ctx.t("edit_phone_number_text"), {
        reply_markup: cancel_keyboard
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
    let data = {
        user_id: ctx.from.id,
        phone: conversation.session.session_db.client.phone,
    }
    await change_user_phone_number(data);
    await ctx.reply(ctx.t("success_done_action"));
    await ctx.conversation.enter("main_menu_conversation");


}

async function user_feedback_conversation(conversation, ctx) {
    let cancel_keyboard = new Keyboard()
        .text(ctx.t("cancel_action_text"))
        .resized();
    await ctx.reply(ctx.t("feedback_comment_text"), {
        reply_markup: cancel_keyboard
    })
    ctx = await conversation.wait();
    await ctx.reply(ctx.t("comment_success_text"))
    return
}
async function order_product_conversation(conversation, ctx) {
    conversation.session.session_db.order_detail.category_id = "64f37d4a7ef5343bde33560d";
    let order_keyboard = new Keyboard()
        .text(ctx.t("back_to_btn_menu"))
        .placeholder(ctx.t("order_count_text"))
        .resized();
    let photo_url = new InputFile("./resource/pictures/aqua_soft.jpg");
    await ctx.api.sendPhoto(ctx.from.id, photo_url, {
        caption: ctx.t("product_details"),
        parse_mode: "HTML",
        reply_markup: order_keyboard
    })

    ctx = await conversation.wait();
    if (check_number(ctx.message)) {
        do {
            await ctx.reply(ctx.t("invalid_order_amount"), {
                parse_mode: "HTML",
            });
            ctx = await conversation.wait();
        } while (check_number(ctx.message));
    }
    conversation.session.session_db.order_detail.order_amout = ctx.message.text;
    let location_keyboard = new Keyboard()
        .requestLocation(ctx.t("location_btn_text"))
        .row()
        .text(ctx.t("back_to_btn_menu"))
        .resized();
    let order_amout = +ctx.message.text;
    await ctx.reply(ctx.t("delivery_location"), {
        parse_mode: "HTML",
        reply_markup: location_keyboard
    })

    ctx = await conversation.wait();
    if (ctx.message?.location == undefined) {
        do {
            // await ctx.answerCallbackQuery();
            await ctx.reply(ctx.t("delivery_location"), {
                parse_mode: "HTML",
                reply_markup: location_keyboard
            });
            ctx = await conversation.wait();
        } while (ctx.message?.location == undefined);
    }
    conversation.session.session_db.order_detail.delivery_location = ctx.message.location;
    if (conversation.session.session_db.order_detail.order_amout) {
        let data = {
            category_id: conversation.session.session_db.order_detail.category_id,
            order_amount: conversation.session.session_db.order_detail.order_amout,
            delivery_location: conversation.session.session_db.order_detail.delivery_location,
            client_id: ctx.from.id
        }
        let new_order = await add_order(data);
        let back_to_main_menu = new Keyboard()
            .text(ctx.t("back_to_btn_menu"))
            .resized();
        await ctx.reply(ctx.t("order_success_message", {
            order_number: new_order.order_number
        }), {
            parse_mode: "HTML",
            reply_markup: back_to_main_menu
        });
        let payment_message = await ctx.reply(ctx.t("order_payment_info", {
            order_number: new_order.order_number,
            order_amout: new_order.order_amount,
            order_price: new_order.order_amount * 15000,
            order_date: new Date(new_order.created_at).toLocaleDateString()
        }), {
            parse_mode: "HTML",
            reply_markup: payment_types_btn_menu,
        });
        await payment_message_id({
            order_id: new_order._id,
            msg_id: payment_message.message_id
        })

        await ctx.api.sendMessage(admin_id, ctx.t("new_order_nessage_to_admin", {
            order_number: new_order.order_number
        }), {
            parse_mode: "HTML"
        })
    } else {
        await ctx.conversation.enter("main_menu_conversation");
    }


}

async function admin_main_menu_conversation(conversation, ctx) {
    let admin_keyboards = new Keyboard()
        .text("💎 Buyurtmalar")
        .text("✍️ Xabar yuborish")
        .row()
        .text("📈 Kunlik hisobot")
        .text("📊 Umumiy statistika")
        .resized();

    await ctx.reply("⚡️ Asosiy Admin menu ⚡️", {
        reply_markup: admin_keyboards
    });
    return


}

async function msg_sender(message, id) {
    return new Promise((resolve, reject) => {
        setTimeout(async () => {
            try {
                let status = await message.copyMessage(id)
                resolve(status);
            } catch (error) {
                reject(error)
            }

        }, 3000)
    })
}


async function send_message_conversation(conversation, ctx) {
    await ctx.reply(`
<b>⚠️ Barcha foydalanuvchilarga xabar jo'natish</b> 

<i>‼️ Xabar matnini yozing yoki xabarni botga yo'naltiring ↗️</i>
    `, {
        parse_mode: "HTML",
    })
    const message_text = await conversation.wait();
    let keyborad = new Keyboard()
        .text("❌ Bekor qilish")
        .text("✅ Tasdiqlash")
        .resized();
    await ctx.reply(`
<i>Xabarni barcha foydalanuvchilarga yuborish uchun <b>✅ Tasdiqlash</b> tugmasini bosing!</i> 
   
    `, {
        reply_markup: keyborad,
        parse_mode:"HTML",
    });
    const msg = await conversation.wait();
    if (msg.message?.text == '✅ Tasdiqlash') {
        await ctx.reply("Barchaga xabar yuborish tugallanishini kuting...⏳")
        let user_list = await get_active_user_list();
        for (let i = 0; i < user_list.length; i++) {
            let user = user_list[i];
            try {
                let status = await msg_sender(message_text, user.user_id);
            } catch (error) {
                console.log(error);
                await remove_user(user.user_id)
            }
        }

        await ctx.reply("Yakunlandi...✅")
        admin_main_menu_conversation(conversation, ctx);
        return

    } else {
        admin_main_menu_conversation(conversation, ctx);
        return
    }





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
    if (user) {
        if (ctx.config.is_admin) {
            await ctx.conversation.enter("admin_main_menu_conversation");
        } else {
            await ctx.conversation.enter("main_menu_conversation");
        }


    } else {
        await ctx.reply(ctx.t("start_text"), {
            parse_mode: "HTML",
            reply_markup: language_menu
        })
    }


})












const order_details_menu = new Menu("order_details_menu")
    .text("🛑 Rad etish", async (ctx) => {
        await ctx.answerCallbackQuery();
        await ctx.deleteMessage();

        if (ctx.session.session_db.selected_order) {

            let rejected = await rejected_order(ctx.session.session_db.selected_order._id);
            if (rejected) {

                await ctx.reply(`<i>✅ <b>${rejected.order_number}</b> raqamli buyurtma rad etildi!</i>`, {
                    parse_mode: "HTML"
                })
                let admin_lang = await ctx.i18n.getLocale();
                let user = await get_userLang(ctx.from.id)
                if (user) {
                    await ctx.i18n.setLocale(user.lang);
                    await ctx.api.sendMessage(rejected.client_id, ctx.t("reject_order_message_text", {
                        order_number: rejected.order_number
                    }), {
                        parse_mode: "HTML"
                    })
                    await ctx.i18n.setLocale(admin_lang);
                }


            } else {
                await ctx.reply(`<i>🛑 <b>${ctx.session.session_db.selected_order.order_number}</b> raqamli buyurtma rad etish mumkin emas!</i>`, {
                    parse_mode: "HTML"
                })
            }

        } else {
            await ctx.reply("⚠️ Eskirgan xabar iltimos qayta urining!")
        }
    })
    .text("💸 To'lov ma'lumoti", async (ctx) => {
        await ctx.answerCallbackQuery();
        await ctx.deleteMessage();
        await ctx.reply("Tez orada ishga tushadi...")
    })
    .row()
    .text("👨‍💼 Buyurtmachi", async (ctx) => {
        await ctx.answerCallbackQuery();
        await ctx.deleteMessage();
        let order = ctx.session.session_db.selected_order;
        if (order) {
            let client = await check_user(order.client_id);
            if (client) {
                await ctx.reply(`
<i>📄 Buyurtmachi ma'lumolari</i>  

📦 Buyurtma raqami: <b>${order.order_number}</b>               
👨‍💼 F.I.SH:   <a href="tg://user?id=${client.user_id}">${client.full_name} </a>       
📞 TELL: <b>${client.phone}</b>          
                            `, {
                    parse_mode: "HTML"
                })
            }


        } else {
            await ctx.reply("⚠️ Eskirgan xabar iltimos qayta urining!")
        }
        let client = await check_user()
    })
    .text("📍 Manzil", async (ctx) => {
        await ctx.answerCallbackQuery();
        await ctx.deleteMessage();
        let order = ctx.session.session_db.selected_order;

        if (order) {
            let title_msg = await ctx.reply(`📍 <b>${order.order_number}</b> raqamli buyurtma manzili:`, {
                parse_mode: "HTML"
            });
            await ctx.api.sendLocation(ctx.from.id, order.delivery_location.latitude, order.delivery_location.longitude, {
                reply_to_message_id: title_msg.message_id
            })
        } else {
            await ctx.reply("⚠️ Eskirgan xabar iltimos qayta urining!")
        }


    })
    .row()
    .text("✅ Yakunlash", async (ctx) => {
        await ctx.answerCallbackQuery();
        await ctx.deleteMessage();
        let order = ctx.session.session_db.selected_order;
        if (order) {
            let deliveed_order = await check_delivered_order(order._id);
            if (deliveed_order) {
                await ctx.reply(`✅ ${order.order_number} raqamli buyurtmani yanunlandi!`)
            } else {
                await ctx.reply(`❌ ${order.order_number} raqamli buyurtmani yakunlash mumkin emas!`)
            }
        } else {
            await ctx.reply("⚠️ Eskirgan xabar iltimos qayta urining!")
        }
        let client = await check_user()
    })

pm.use(order_details_menu)











// language menu
const order_list_menu = new Menu("order_list_menu")
    .dynamic(async (ctx, range) => {
        let list = await active_orders();
        list.forEach((item) => {
            range
                .text(`${item.order_number} | ${new Date(item.created_at).toLocaleDateString()} ${(item.is_payment ? " 💎" : " *")}`, async (ctx) => {
                    await ctx.answerCallbackQuery();
                    ctx.session.session_db.selected_order = item;
                    await ctx.reply(`
📄 Buyurtma raqami: <b>${item.order_number}</b> 
📍 Turi: <b>${item.category_id.name}</b>
📦 Miqdori: <b>${item.order_amount}</b> ta
💰 Narxi: <b>${item.order_amount * 15000}</b> so'm
🕓 Sana: <b>${new Date(item.created_at).toLocaleString()}</b>
💸 To'lov holati: <b>${item.is_payment ? "✅" : "❌"}</b>

📞 Aloqa: <a href="tg://user?id=${item.client_id}">Telegram</a>
`, {
                        parse_mode: "HTML",
                        reply_markup: order_details_menu
                    })
                })
                .row();
        })
    })
pm.use(order_list_menu)









bot.filter(hears("product_text"), async (ctx) => {
    await ctx.conversation.enter("order_product_conversation");
});



bot.filter(hears("feedback_menu_text"), async (ctx) => {
    await ctx.conversation.enter("user_feedback_conversation");
});

bot.filter(hears("setting_menu_text"), async (ctx) => {
    let setting_keyboard = new Keyboard()
        .text(ctx.t("change_language_text"))
        .text(ctx.t("change_my_info"))
        .row()
        .text(ctx.t("back_to_btn_menu"))
        .resized()
    await ctx.reply(ctx.t("setting_change_text"), {
        parse_mode: "HTML",
        reply_markup: setting_keyboard
    });
});
// change language
bot.filter(hears("change_language_text"), async (ctx) => {
    let language_keyboard = new Keyboard()
        .text(ctx.t("language_uz"))
        .text(ctx.t("language_ru"))
        .row()
        .text(ctx.t("back_to_setting_menu"))
        .resized()

    await ctx.reply(ctx.t("language_change_text"), {
        parse_mode: "HTML",
        reply_markup: language_keyboard
    });
});
// my info
bot.filter(hears("change_my_info"), async (ctx) => {
    let user = await check_user(ctx.from.id);
    let info_keyboard = new Keyboard()
        .text(ctx.t("change_full_name_text"))
        .text(ctx.t("change_phone_number_text"))
        .row()
        .text(ctx.t("cancel_changing_text"))
        .resized();
    if (user) {
        await ctx.reply(ctx.t("change_my_info_text", {
            full_name: user.full_name,
            phone_number: user.phone,
        }), {
            parse_mode: "HTML",
            reply_markup: info_keyboard
        })
    } else {
        await ctx.reply("⚠️ User not found")
    }

});
// cancel action btn
bot.filter(hears("cancel_action_text"), async (ctx) => {
    await ctx.conversation.enter("main_menu_conversation");
});
// my orders info
bot.filter(hears("my_order_text"), async (ctx) => {
    let back_main_menu = new Keyboard()
        .text(ctx.t("back_to_btn_menu"))
        .resized();

    let my_orders_list = await my_orders(ctx.from.id);
    if (my_orders_list.length > 0) {
        let my_order_text = "<b>🛒 Buyurtmalarim</b> \n <i>🚚 Yetkazib berilishi kutilayotgan buyurtmalar.</i>"
        for (const product of my_orders_list) {
            let template_text = `\n
📄 Buyurtma raqami: <b>${product.order_number}</b> 
📍 Buyurtma turi: <b>${product.category_id.name}</b>
📦 Buyurtma miqdori: <b>${product.order_amount}</b> ta
💰 Buyurtma narxi: <b>${product.order_amount * 15000}</b> so'm
🕓 Buyurtma sanasi: <b>${new Date(product.created_at).toLocaleString()}</b>
💸 To'lov holati: <b>${product.is_payment ? "✅" : "❌"}</b>`
            my_order_text = my_order_text + template_text;
        }

        await ctx.reply(my_order_text, {
            parse_mode: "HTML",
            reply_markup: back_main_menu
        })


    } else {
        await ctx.reply(ctx.t("no_my_order_yet"), {
            parse_mode: "HTML"
        })
    }

});

// edit user fullname
bot.filter(hears("change_full_name_text"), async (ctx) => {
    await ctx.conversation.enter("change_fullname_conversation");
});

// edit user phone number
bot.filter(hears("change_phone_number_text"), async (ctx) => {
    await ctx.conversation.enter("change_phone_number_conversation");
});

// calcel btn
bot.filter(hears("cancel_changing_text"), async (ctx) => {
    let setting_keyboard = new Keyboard()
        .text(ctx.t("change_language_text"))
        .text(ctx.t("change_my_info"))
        .row()
        .text(ctx.t("back_to_btn_menu"))
        .resized()
    await ctx.reply(ctx.t("setting_change_text"), {
        parse_mode: "HTML",
        reply_markup: setting_keyboard
    });
});
// bot.filter(hears("back_to_btn_menu"), async (ctx) => {
//     await ctx.conversation.enter("user_feedback_conversation");
// });
// back to main menu
bot.filter(hears("back_to_btn_menu"), async (ctx) => {
    await ctx.conversation.enter("main_menu_conversation");
});
// back to setting menu
bot.filter(hears("back_to_setting_menu"), async (ctx) => {
    let setting_keyboard = new Keyboard()
        .text(ctx.t("change_language_text"))
        .text(ctx.t("change_my_info"))
        .row()
        .text(ctx.t("back_to_btn_menu"))
        .resized()
    await ctx.reply(ctx.t("setting_change_text"), {
        parse_mode: "HTML",
        reply_markup: setting_keyboard
    });
})
// about us
bot.filter(hears("about_menu_text"), async (ctx) => {
    let photo_url = new InputFile("./resource/pictures/logo.jpg");
    await ctx.api.sendPhoto(ctx.from.id, photo_url, {
        caption: ctx.t("about_me_company_text", { phone_number: connect_phone }),
        parse_mode: "HTML",
    })
});
// Contacts
bot.filter(hears("call_center_menu_text"), async (ctx) => {
    await ctx.reply(ctx.t("call_center_info_text"), {
        parse_mode: "HTML"
    })
});

// gift
bot.filter(hears("gift_menu_text"), async (ctx) => {
    await ctx.reply(ctx.t("gift_info_text"), {
        parse_mode: "HTML"
    })
});

// selected uz language
bot.filter(hears("language_uz"), async (ctx) => {
    await ctx.i18n.setLocale("uz");
    data = {
        user_id: ctx.from.id,
        lang: "uz"
    }
    await set_userLang(data);
    await ctx.conversation.enter("main_menu_conversation");
});
// selected ru language
bot.filter(hears("language_ru"), async (ctx) => {
    await ctx.i18n.setLocale("ru");
    data = {
        user_id: ctx.from.id,
        lang: "ru"
    }
    await set_userLang(data);
    await ctx.conversation.enter("main_menu_conversation");
});


// admin panel keyboards
bot.hears("💎 Buyurtmalar", async (ctx) => {
    await ctx.reply(`
<b>Buyurtmalar ro'yhati</b>   

<i>💎 - To'lov qilingan buyurtmalar</i> 
<i><b>*</b> - To'lov qilinmagan buyurtmalar</i> 

<i>🫵 Buyurtma tavsilotlarini ko'rish uchun buyurtma ustiga bosing!</i>
    `, {
        parse_mode: "HTML",
        reply_markup: order_list_menu
    })
})
bot.hears("📈 Kunlik hisobot", async (ctx) => {
    let statistic_data = await statistic_daily();
    await ctx.reply(`
<b>📈 Kunlik xisobot</b>  

💎 Buyurtmalar soni: <b>${statistic_data.all_count}</b>
🚚 Yetkazilganlar : <b>${statistic_data.deliveried_count}</b>
💰 To'lov qiingan : <b>${statistic_data.payment_count}</b>
❗️ Rad etilgan : <b>${statistic_data.reject_count}</b>

🗓 Sana : <b>${new Date().toLocaleDateString()}</b>
   `, {
        parse_mode: "HTML"
    })
})


bot.hears("📊 Umumiy statistika", async (ctx) => {
    let statistic_data = await general_statistic();
    await ctx.reply(`
 <b>📊 Umimiy statistika</b>  
 
 💎 Buyurtmalar soni: <b>${statistic_data.all_count}</b>
 🚚 Yetkazilganlar : <b>${statistic_data.deliveried_count}</b>
 💰 To'lov qiingan : <b>${statistic_data.payment_count}</b>
 ❗️ Rad etilgan : <b>${statistic_data.reject_count}</b>
 
 👤 Mijozlar : <b>${statistic_data.users_count}</b>
 💸 Umumiy summa : <b>${statistic_data.total_price} so'm</b>
    `, {
        parse_mode: "HTML"
    })
})

bot.hears("✍️ Xabar yuborish", async (ctx) => {

    await ctx.conversation.enter("send_message_conversation");



})



bot.use(async (ctx, next) => {
    let user = await get_userLang(ctx.from.id)
    if (user) {
        await ctx.i18n.setLocale(user.lang);
        if (ctx.config.is_admin) {
            await ctx.conversation.enter("admin_main_menu_conversation");
        } else {
            await ctx.conversation.enter("main_menu_conversation");
        }
    }

    next()
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