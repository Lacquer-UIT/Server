const mongoose = require("mongoose");
const { Schema } = mongoose;

// Example schema
const ExampleSchema = new Schema({
  phrase: String,
  translation: String,
});

// Definition schema
const DefinitionSchema = new Schema({
  text: { type: String, required: true },
  examples: { type: [ExampleSchema], default: [] },
});

// Meaning schema
const MeaningSchema = new Schema({
  part_of_speech: {
    type: { type: String, required: true },
  },
  definitions: { type: [DefinitionSchema], required: true },
});

// Main dictionary schema
const DictionaryEntrySchema = new Schema(
  {
    word: { type: String, required: true, index: true },
    pronunciations: { type: [String], default: [] },
    meanings: { type: [MeaningSchema], required: true },
  },
  { collection: "Eng-Vie" }
);

const Dictionary = mongoose.model("Dictionary", DictionaryEntrySchema);
module.exports = Dictionary;