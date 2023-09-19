const { User } = require("../models/userModels");
const customLogger = require("../config/customLogger")


const register_user = async (data) => {
    try {
        let exist_user = await User.findOne({ user_id: data.user_id }).exec();
        if (!exist_user) {
            await User.create(data)
        } else {
            await User.findByIdAndUpdate(exist_user._id, data);
        }
    } catch (error) {
        customLogger.log({
            level: 'error',
            message: error
        });
    }

}

const remove_user = async (user_id) => {
    try {
        let exist_user = await User.findOne({ user_id }).exec();
        if (exist_user) {
            await User.findByIdAndUpdate(exist_user._id, {
                active_user: false,
            });
        } else {
            console.log("User no found for removing...");
        }
    } catch (error) {
        customLogger.log({
            level: 'error',
            message: error
        });
    }
}

const set_userLang = async (data) => {
    try {
        let exist_user = await User.findOne({ user_id:data.user_id }).exec();
        if (exist_user) {
            await User.findByIdAndUpdate(exist_user._id, {
                lang: data.lang,
            });
        }
    } catch (error) {
        customLogger.log({
            level: 'error',
            message: error
        });
    }
}

const get_userLang = async(user_id)=>{
    try {
        return await User.findOne({ user_id }).exec();
        
    } catch (error) {
        customLogger.log({
            level: 'error',
            message: error
        });
    }
}

const check_user = async(user_id)=>{
    try{
        return await User.findOne({ user_id, active_user:true }).exec();
    }catch(error){
        customLogger.log({
            level: 'error',
            message: error
        });
    }
}

const change_user_fullname = async(data)=>{
    try{
        let exist_user = await User.findOne({ user_id:data.user_id }).exec();
        if (exist_user) {
            await User.findByIdAndUpdate(exist_user._id, {
                full_name: data.full_name,
            });
        }
    }catch(error){
        customLogger.log({
            level: 'error',
            message: error
        });
    }
}


const change_user_phone_number = async(data)=>{
    try{
        let exist_user = await User.findOne({ user_id:data.user_id }).exec();
        if (exist_user) {
            await User.findByIdAndUpdate(exist_user._id, {
                phone: data.phone,
            });
        }
    }catch(error){
        customLogger.log({
            level: 'error',
            message: error
        });
    }
}
 const get_active_user_list = async()=>{
    try{
        return await User.find({active_user:true }).exec();
    }catch(error){
        customLogger.log({
            level: 'error',
            message: error
        });
    }
 }

module.exports = {
    register_user,
    remove_user,
    set_userLang,
    get_userLang,
    check_user,
    change_user_fullname,
    change_user_phone_number,
    get_active_user_list,
}