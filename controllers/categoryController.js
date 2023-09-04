const { Category } = require("../models/categoryModels");
const customLogger = require("../config/customLogger")


const add_category = async (data) => {
    try {
        // data = {
        //     name: "19 L",
        //     price:15000
        // }
        // return await Category.create(data)


    } catch (error) {
        customLogger.log({
            level: 'error',
            message: error
        });
    }
}
const get_categories = async () => {
    try {
        return await Category.find({})

    } catch (error) {
        customLogger.log({
            level: 'error',
            message: error
        });
    }
}



module.exports = {
    get_categories,
    add_category
}