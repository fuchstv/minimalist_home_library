import { describe, it, expect } from 'vitest';
import { parseBibTeX, cleanLatexEscapes } from './bibtexParser';

describe('cleanLatexEscapes', () => {
    it('should clean German umlauts', () => {
        expect(cleanLatexEscapes('Gr{\\"o}{\\"u}{\\"a}{\\"A}e')).toBe('GröüäÄe');
        expect(cleanLatexEscapes('Stra{\\ss}e')).toBe('Straße');
    });

    it('should clean Polish diacritics', () => {
        expect(cleanLatexEscapes(' Stanis{\\l}aw Lem')).toBe(' Stanisław Lem');
        expect(cleanLatexEscapes('{\\L}ukasz')).toBe('Łukasz');
        expect(cleanLatexEscapes('k{\\k{a}}zka')).toBe('kązka');
        expect(cleanLatexEscapes('pr{\\k{e}}s')).toBe('pręs');
        expect(cleanLatexEscapes("g{\\'o}ra")).toBe('góra');
        expect(cleanLatexEscapes("{\\'o}wczesny")).toBe('ówczesny');
    });

    it('should clean special symbols and nested capitalisation brackets', () => {
        expect(cleanLatexEscapes('The {LaTeX} Companion \\& Co.')).toBe('The LaTeX Companion & Co.');
    });
});

describe('parseBibTeX', () => {
    it('should parse simple book entry', () => {
        const bib = `
            @book{companion93,
                author = "Michel Goossens and Frank Mittelbach",
                title = {The LaTeX Companion},
                year = "1993",
                publisher = "Addison-Wesley",
                isbn = "0-201-54199-8"
            }
        `;
        const result = parseBibTeX(bib);
        expect(result).toHaveLength(1);
        expect(result[0]).toEqual({
            title: 'The LaTeX Companion',
            author: 'Michel Goossens and Frank Mittelbach',
            category: '',
            publisher: 'Addison-Wesley',
            publication_year: '1993',
            isbn: '0-201-54199-8',
            description: ''
        });
    });

    it('should handle nested braces, comments and whitespace', () => {
        const bib = `
            % This is a comment at the top
            @article{articleKey,
                title = {An {Introduction} to {\\"{O}}sterreich},
                author = {J. Doe},
                year = 2021,
                abstract = {A nested {braces {depth} test} here.}
            }
            % Another comment
        `;
        const result = parseBibTeX(bib);
        expect(result).toHaveLength(1);
        expect(result[0].title).toBe('An Introduction to Österreich');
        expect(result[0].publication_year).toBe('2021');
        expect(result[0].description).toBe('A nested braces depth test here.');
    });

    it('should parse multiple entries correctly', () => {
        const bib = `
            @book{book1,
                title = {Book One},
                author = {Author A}
            }
            @misc{misc1,
                title = {Misc Two},
                author = {Author B}
            }
        `;
        const result = parseBibTeX(bib);
        expect(result).toHaveLength(2);
        expect(result[0].title).toBe('Book One');
        expect(result[1].title).toBe('Misc Two');
    });

    it('should skip entries without a title', () => {
        const bib = `
            @book{notitle,
                author = {Author No Title}
            }
        `;
        const result = parseBibTeX(bib);
        expect(result).toHaveLength(0);
    });
});
