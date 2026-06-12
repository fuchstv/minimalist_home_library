export interface ParsedBook {
    title: string;
    author: string;
    category: string;
    publisher: string;
    publication_year: string;
    isbn: string;
    description: string;
}

export function cleanLatexEscapes(str: string): string {
    if (!str) return '';
    return str
        // German Umlauts (with nested brackets like {\"{O}} or {\"O} or \"o)
        .replace(/\\"{a}/g, 'ä')
        .replace(/\\"{A}/g, 'Ä')
        .replace(/\\"{o}/g, 'ö')
        .replace(/\\"{O}/g, 'Ö')
        .replace(/\\"{u}/g, 'ü')
        .replace(/\\"{U}/g, 'Ü')
        
        .replace(/{\\"a}/g, 'ä')
        .replace(/{\\"A}/g, 'Ä')
        .replace(/{\\"o}/g, 'ö')
        .replace(/{\\"O}/g, 'Ö')
        .replace(/{\\"u}/g, 'ü')
        .replace(/{\\"U}/g, 'Ü')

        .replace(/\\"a/g, 'ä')
        .replace(/\\"A/g, 'Ä')
        .replace(/\\"o/g, 'ö')
        .replace(/\\"O/g, 'Ö')
        .replace(/\\"u/g, 'ü')
        .replace(/\\"U/g, 'Ü')

        .replace(/\\ss\b|{\\ss}/g, 'ß')
        
        // Polish characters
        .replace(/\\l\b|{\\l}/g, 'ł')
        .replace(/\\L\b|{\\L}/g, 'Ł')
        
        .replace(/\\'{[z]}/g, 'ź')
        .replace(/\\'{[Z]}/g, 'Ź')
        .replace(/\\'{[c]}/g, 'ć')
        .replace(/\\'{[C]}/g, 'Ć')
        .replace(/\\'{[n]}/g, 'ń')
        .replace(/\\'{[N]}/g, 'Ń')
        .replace(/\\'{[s]}/g, 'ś')
        .replace(/\\'{[S]}/g, 'Ś')
        .replace(/\\'{[o]}/g, 'ó')
        .replace(/\\'{[O]}/g, 'Ó')
        
        .replace(/\\.{[z]}/g, 'ż')
        .replace(/\\.{[Z]}/g, 'Ż')

        .replace(/{\\'z}/g, 'ź')
        .replace(/{\\'Z}/g, 'Ź')
        .replace(/{\\.z}/g, 'ż')
        .replace(/{\\.Z}/g, 'Ż')
        .replace(/{\\'c}/g, 'ć')
        .replace(/{\\'C}/g, 'Ć')
        .replace(/{\\'n}/g, 'ń')
        .replace(/{\\'N}/g, 'Ń')
        .replace(/{\\'s}/g, 'ś')
        .replace(/{\\'S}/g, 'Ś')
        .replace(/{\\'o}/g, 'ó')
        .replace(/{\\'O}/g, 'Ó')

        .replace(/\\'[zZ]/g, 'ź')
        .replace(/\\'[cC]/g, 'ć')
        .replace(/\\'[nN]/g, 'ń')
        .replace(/\\'[sS]/g, 'ś')
        .replace(/\\.[zZ]/g, 'ż')
        .replace(/\\'[oO]/g, 'ó')

        .replace(/\\k\s*{a}|{\\k\s*a}/gi, 'ą')
        .replace(/\\k\s*{e}|{\\k\s*e}/gi, 'ę')
        
        // General accents
        .replace(/\\'{a}/g, 'á')
        .replace(/\\'{A}/g, 'Á')
        .replace(/\\'{e}/g, 'é')
        .replace(/\\'{E}/g, 'É')
        
        .replace(/{\\'a}/g, 'á')
        .replace(/{\\'e}/g, 'é')
        .replace(/\\'[aA]/g, 'á')
        .replace(/\\'[eE]/g, 'é')
        
        // Special symbols
        .replace(/\\&/g, '&')
        .replace(/\\_/g, '_')
        .replace(/\\%/g, '%')
        .replace(/\\$/g, '$')
        
        // Strip out brackets used for capitalization keeping in bibtex
        .replace(/{([a-zA-Z0-9\s,\.\-\(\)\:\;\!\?]*)}/g, '$1')
        .replace(/{|}/g, ''); // remove any remaining unmatched braces
}

export function parseBibTeX(text: string): ParsedBook[] {
    const books: ParsedBook[] = [];
    let pos = 0;

    function skipWhitespaceAndComments() {
        while (pos < text.length) {
            const char = text[pos];
            if (/\s/.test(char)) {
                pos++;
            } else if (char === '%') {
                while (pos < text.length && text[pos] !== '\n') {
                    pos++;
                }
            } else {
                break;
            }
        }
    }

    while (pos < text.length) {
        skipWhitespaceAndComments();
        if (pos >= text.length) break;

        if (text[pos] !== '@') {
            pos++;
            continue;
        }

        pos++; // skip '@'

        let entryType = '';
        while (pos < text.length && /[a-zA-Z0-9]/i.test(text[pos])) {
            entryType += text[pos];
            pos++;
        }

        skipWhitespaceAndComments();
        if (pos >= text.length || text[pos] !== '{') {
            continue;
        }
        pos++; // skip '{'

        // Read citation key
        skipWhitespaceAndComments();
        let citeKey = '';
        while (pos < text.length && /[^,\s}]/.test(text[pos])) {
            citeKey += text[pos];
            pos++;
        }

        skipWhitespaceAndComments();
        if (text[pos] === ',') {
            pos++; // skip ','
        }

        const fields: Record<string, string> = {};

        while (pos < text.length) {
            skipWhitespaceAndComments();
            if (pos >= text.length) break;

            if (text[pos] === '}') {
                pos++; // end of entry
                break;
            }

            // Read key name
            let key = '';
            while (pos < text.length && /[a-zA-Z0-9_\-]/i.test(text[pos])) {
                key += text[pos];
                pos++;
            }

            key = key.toLowerCase();

            skipWhitespaceAndComments();
            if (pos >= text.length) break;

            if (text[pos] !== '=') {
                if (text[pos] === ',') {
                    pos++;
                    continue;
                }
                pos++;
                continue;
            }
            pos++; // skip '='

            skipWhitespaceAndComments();
            if (pos >= text.length) break;

            // Read value
            let value = '';
            if (text[pos] === '{') {
                pos++; // skip '{'
                let braceCount = 1;
                while (pos < text.length && braceCount > 0) {
                    if (text[pos] === '{') {
                        braceCount++;
                    } else if (text[pos] === '}') {
                        braceCount--;
                    }
                    if (braceCount > 0) {
                        value += text[pos];
                    }
                    pos++;
                }
            } else if (text[pos] === '"') {
                pos++; // skip '"'
                while (pos < text.length && text[pos] !== '"') {
                    if (text[pos] === '\\' && text[pos + 1] === '"') {
                        value += '"';
                        pos += 2;
                    } else {
                        value += text[pos];
                        pos++;
                    }
                }
                if (pos < text.length) pos++; // skip closing '"'
            } else {
                // simple unquoted value
                while (pos < text.length && /[^,\s}]/.test(text[pos])) {
                    value += text[pos];
                    pos++;
                }
            }

            if (key) {
                fields[key] = value.trim();
            }

            skipWhitespaceAndComments();
            if (pos < text.length && text[pos] === ',') {
                pos++; // skip ','
            }
        }

        // Map fields to book structure if title exists
        if (fields.title) {
            books.push({
                title: cleanLatexEscapes(fields.title),
                author: cleanLatexEscapes(fields.author || ''),
                category: cleanLatexEscapes(fields.keywords || fields.tags || fields.journal || fields.booktitle || ''),
                publisher: cleanLatexEscapes(fields.publisher || ''),
                publication_year: cleanLatexEscapes(fields.year || ''),
                isbn: cleanLatexEscapes(fields.isbn || ''),
                description: cleanLatexEscapes(fields.abstract || fields.note || fields.description || '')
            });
        }
    }

    return books;
}
