const mongoose = require("mongoose");

const userSchema = mongoose.Schema({
    user_id:{
        type:Number,
        required:true,
        unique:true,
    },
    phone:String,
    first_name:String,
    full_name:String,
    username:String,
    lang:{
        type:String,
        default:null,
    },
    active_user:{
        type:Boolean,
        default:true,
    }
})



const User = mongoose.model("User", userSchema);
module.exports = {User}