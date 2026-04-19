/**
 * CCompiler — Main API for compiling C to assembly.
 * Ties together Lexer, Parser, and CodeGenerator.
 */
import { tokenize } from './Lexer.js';
import { parse } from './Parser.js';
import { CodeGenerator } from './CodeGenerator.js';
import { assemble } from '../Assembler.js';

/**
 * Compile C source code to assembly lines.
 * @param {string} source
 * @returns {{ asm: string[], errors: string[], constants: object }}
 */
export function compileC(source) {
  const errors = [];

  // Tokenize
  let tokens;
  try {
    tokens = tokenize(source);
  } catch (e) {
    return { asm: [], errors: [e.message], constants: {} };
  }

  // Parse
  let ast;
  try {
    ast = parse(tokens);
  } catch (e) {
    return { asm: [], errors: [e.message], constants: {} };
  }

  // Generate code
  const gen = new CodeGenerator();
  const result = gen.generate(ast);
  errors.push(...result.errors);

  // Filter comment-only lines
  const cleanAsm = result.asm.filter(line => !line.startsWith(';'));

  return { asm: cleanAsm, errors, constants: {} };
}

/**
 * Compile C source code directly to ROM data.
 * @param {string} source
 * @returns {{ memory: object, errors: string[], asm: string[], constants: object }}
 */
export function compileCToROM(source) {
  const { asm, errors, constants } = compileC(source);
  const memory = {};
  for (let i = 0; i < asm.length; i++) {
    try {
      memory[i] = assemble(asm[i]);
    } catch (e) {
      errors.push(`Assembly error at line ${i}: ${e.message} (${asm[i]})`);
      memory[i] = 0;
    }
  }
  return { memory, errors, asm, constants };
}
