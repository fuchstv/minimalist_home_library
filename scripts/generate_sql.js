const fs = require('fs');

const files = fs.readdirSync('./csv');
const filename = files.find(f => f.endsWith('.csv'));
const csv = fs.readFileSync(`./csv/${filename}`, 'utf8');
const lines = csv.split('\n');

let sql = "SET NAMES 'utf8mb4';\n\nINSERT INTO books (category, author, title, publication_year, publisher, isbn) VALUES \n";
let values = [];

// Skip header
for (let i = 1; i < lines.length; i++) {
    let line = lines[i].trim();
    if (!line) continue;
    
    // Split by semicolon
    const parts = line.split(';');
    if (parts.length >= 6) {
        const category = parts[0].replace(/'/g, "''");
        const author = parts[1].replace(/'/g, "''");
        const title = parts[2].replace(/'/g, "''");
        const year = parts[3].replace(/'/g, "''");
        const publisher = parts[4].replace(/'/g, "''");
        const isbn = parts[5].replace(/'/g, "''");
        
        values.push(`('${category}', '${author}', '${title}', '${year}', '${publisher}', '${isbn}')`);
    }
}

sql += values.join(",\n") + ";\n";

fs.writeFileSync('./database/02_import.sql', sql);
console.log('Successfully generated 02_import.sql');
