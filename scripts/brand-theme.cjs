const fs = require('fs');
const file = 'frontend/src/styles.css';
let css = fs.readFileSync(file, 'utf8');
const colors = {
  '#193453':'#203c3b', '#f4f7fb':'#f3f7f4', '#174984':'#126a6c',
  '#2864a8':'#0d5557', '#72acff':'#dbb341', '#103765':'#126a6c',
  '#b3c9e0':'#d1e8df', '#c6d8ed':'#d5ebe5', '#96b4d4':'#a8d4c8',
  '#123d70':'#124e4d', '#eef5ff':'#fff6d7', '#d4e4f6':'#e4f0e5',
  '#9eb8d3':'#b4d6ce', '#e1e8f0':'#dce8e2', '#7b8b9e':'#6d8580',
  '#c6d2df':'#bdcec5', '#6b86a5':'#6b8980', '#5b8cd3':'#d8aa33',
  '#7b8a9d':'#758b82', '#e2e9f2':'#dfe9e2', '#788ba0':'#6c8278',
  '#94a1b0':'#84988e', '#e6eefb':'#fbf0cc', '#d6e3f8':'#f0dfa6',
  '#5678a3':'#7d682b', '#93a0af':'#7f9489', '#eef3f9':'#eaf4ed',
  '#6380a3':'#527b6c', '#8798ab':'#70867c', '#f8fafc':'#f6f9f5',
  '#eaf0f6':'#e5eee5', '#edf1f5':'#ebf0e9', '#285b93':'#126a6c',
  '#99a6b5':'#83998d', '#507cae':'#126a6c', '#a0adbc':'#859a8d',
  '#96a5b6':'#81988b', '#dfe7f1':'#d9e5dc', '#607b9b':'#54786a',
  '#edf3f9':'#edf5ef', '#31567d':'#315e51', '#ccd9e8':'#cedfd2',
  '#edf3fa':'#e9f3eb', '#315e90':'#285e53', '#dce9f8':'#dcecdf',
  '#e5edf6':'#e3ebe2', '#f0f5fc':'#f8f1d9', '#71859b':'#768a7c',
  '#8397ad':'#789184', '#7ca0d2':'#b9a150', '#45688d':'#396c5c',
};
for (const [from, to] of Object.entries(colors)) css = css.replaceAll(from, to);
fs.writeFileSync(file, css);
