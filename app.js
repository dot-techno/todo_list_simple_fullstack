//jshint esversion:6

import express from "express";
import mongoose from "mongoose";
import {getDate, getDay} from "./date.js";


const app = express();

app.set('view engine', 'ejs');

app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

mongoose.connect("mongodb://localhost:27017/todolistdb");
const itemsSchema = new mongoose.Schema({
    name: String
});

// mongoose.model takes a singular term like Item but makes a collection in mongodb called "items"
// the collection name is lower case and plural of the word passed to .model() -- WHY this complexity????
const Item = mongoose.model('Item', itemsSchema);


// --- Only need to run this code once ---
// const default_items = [new Item({ name: "Welcome to your todo list!" }),
//     new Item({ name: "Hit the + button to add a new item" }),
//     new Item({ name: "<-- Hit this to delete an item." })];

// let rr = await Item.insertMany(default_items);
// console.log(rr);

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

    res.render("list", { listTitle: day, newListItems: items_records });

});

app.post("/", function (req, res) {

    const itemName = req.body.newItem; // get text the user entered in teh input field iwth name="newItem"
    // create mongoDB record
    const item = new Item({ name: itemName});
    item.save(); // save this item into collection

    return res.redirect("/"); // reload and reshow items.

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
