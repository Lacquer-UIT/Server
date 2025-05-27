const mongoose = require("mongoose");
const { Schema } = mongoose;

// Example schema
const ExampleSchema = new Schema({
  phrase: String,
  translation: String,
});

// Definition schema
const DefinitionSchema = new Schema({
  text: { type: String, required: true }
});

// WordType schema (replacing the old MeaningSchema)
const WordTypeSchema = new Schema({
  type: { type: String, required: true },
  definitions: { type: [String], required: true }
});

// Main dictionary schema
const DictionaryEntrySchema = new Schema(
  {
    word: { type: String, required: true, index: true },
    pronunciation: { type: String },  // Changed from pronunciations array to single string
    img: { type: [String], default: [] },
    wordTypes: { type: [WordTypeSchema], required: true },  // Changed from meanings to wordTypes
    difficulty: { type: String },  // Added difficulty field
    examples: { type: [ExampleSchema], default: [] },
  },
  { collection: "Eng-Vie" }
);

const Dictionary = mongoose.model("Dictionary", DictionaryEntrySchema);
module.exports = Dictionary;