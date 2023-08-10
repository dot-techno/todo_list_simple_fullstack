//jshint esversion:6

import express from "express";
import mongoose from "mongoose";
import {getDate, getDay} from "./date.js";
import dotenv from 'dotenv'
dotenv.config()
console.log(process.env);

const app = express();

app.set('view engine', 'ejs');

app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

// process.env has:
// mongo_server, mongo_login and mongo_password 
// These are loaded from env variables

mongoose.connect(process.env.mongo_server, {user: process.env.mongo_login, pass: process.env.mongo_password});

const itemsSchema = new mongoose.Schema({
    name: String
});

const listSchema = new mongoose.Schema({
    name: String,
    items: [itemsSchema]
});

// mongoose.model takes a singular term like Item but makes a collection in mongodb called "items"
// the collection name is lower case and plural of the word passed to .model() -- WHY this complexity????
const Item = mongoose.model('Item', itemsSchema);
const List = mongoose.model("List", listSchema);



let items_records = []; // this will be a list of task names, must be defined outside try{} block.

const default_items = [new Item({ name: "Welcome to your todo list!" }),
                    new Item({ name: "Hit the + button to add a new item" }),
                    new Item({ name: "<-- Hit this to delete an item." })];



app.get("/", async function (req, res) {

    try {

        // make attempt to read items if existing in db
        items_records = await Item.find({}); // get records from MongoDB
        console.log(items_records.length + " items loaded from databse.");
        
        // if db was blank, i.e. first time running app...
        if(items_records.length == 0){
            console.log("Adding default items...");
            try {
                let result = await Item.insertMany(default_items);
                console.log(result.length +" items added to database.");
                items_records = await Item.find({}); // read in the default items.
            }catch(err){
                console.log("Error inserting default items:"+ err);
            }
        }
    } catch(err){
        console.log("Error: "+err);
    }

    const day = getDate();
    // must pass mongoDB items to EJS file so that it can return ID of task item when its checked to be deleted
    res.render("list", { listTitle: day, newListItems: items_records });

});


// By passting a name after / user can create or load a list with that name
// e.g. /School will create a list called School or load it if it exists
//
app.get("/:listName", async function(req,res){
    let list_name = titleCase(req.params.listName);
    let list = undefined;
    try {
        list = await List.findOne({name: list_name});
    }catch(err){
        console.log("Could not find list: "+ list_name + "\n"+err);
    }


    if (!list) {
        list = new List({
            name: list_name,
            items: default_items,
        });
    
        list.save();
        console.log("New list created with name "+list_name);
        return res.redirect("/"+list_name);
    }
    console.log("List name:" + list.name);
    return res.render("list", { listTitle: list.name, newListItems: list.items });

});


app.post("/", async function (req, res) {

    const itemName = req.body.newItem; // get text the user entered in teh input field iwth name="newItem"
    const listName = req.body.list; // list is name of button that has value set to listTitle
    // create mongoDB record
    const item = new Item({ name: itemName});

    console.log("Post route called for + button.");

    if(listName === getDate()){
        console.log("Adding item to default list: "+getDate());
        await item.save(); // save item to default collection called items    
        return res.redirect("/"); // reload and reshow items.
    }

    let list = undefined;
    try {
        list = await List.findOne({name: listName});
        list.items.push(item);
        list.save();
    }catch(err){
        console.log("Could not find list: "+ listName + "\n"+err);
    }

    return res.redirect("/"+listName);

});

app.post("/delete", async function(req,res) {
    const item_id = req.body.checkbox;
    const listName = req.body.listName; // from the hidden form input

    if(listName === getDate()){
        try{
            let result = await Item.findByIdAndRemove(item_id);
            console.log("Success, deleted item with id "+result._id);
        }catch(err){
            console.log("Error deleting item. "+err);
        }
        return res.redirect("/"); // re-render to do list to update display with deleted item removed

    } else{
        try{
            let doc = await List.findOneAndUpdate({name: listName},
                {$pull:{items: {_id:item_id}}} );
                console.log("Success, deleted item with id "+item_id+ " forom list "+listName);

        }catch(err){
            console.log("Err deleting item in list: "+listName);
        }
        return res.redirect("/"+listName);

    }
    
  
});


app.get("/work", function (req, res) {
    res.render("list", { listTitle: "Work List", newListItems: workItems });
});

app.get("/about", function (req, res) {
    res.render("about");
});

app.listen(3000, function () {
    console.log("Server started on port 3000");
});


function titleCase(str) {
    if ((str === null) || (str === ''))
        return str;
 
    return str.replace(/\w\S*/g,
        function (txt) {
            return txt.charAt(0).toUpperCase() +
                txt.substr(1).toLowerCase();
        });
}