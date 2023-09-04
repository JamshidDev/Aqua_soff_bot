const mongoose = require("mongoose");


const categorySchema = mongoose.Schema({
    name:String,
    price:{
        type:Number,
        required:true,
    },
    active:{
        type:Boolean,
        default:true
    }
})


const Category = mongoose.model("Category", categorySchema);

module.exports = {Category}