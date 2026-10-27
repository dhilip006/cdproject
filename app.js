
/* ==========================================
   SYNTAX GROVE
   Syntax Tree + Syntax-Directed Translation
   Supports numbers, alphabets and operators
========================================== */

const $ = (selector) => document.querySelector(selector);

// ==========================================
// ERROR MESSAGE
// ==========================================

function showError(message) {
    const toast = $("#toast");
    const toastMessage = $("#toast-message");

    if (!toast) {
        alert(message);
        return;
    }

    if (toastMessage) {
        toastMessage.textContent = message;
    }

    toast.classList.remove("hide");
    toast.classList.add("show");
}

function hideError() {
    const toast = $("#toast");

    if (toast) {
        toast.classList.remove("show");
        toast.classList.add("hide");
    }
}

// ==========================================
// TOKENIZER
// ==========================================

function tokenize(input) {
    const tokens = [];
    let i = 0;

    while (i < input.length) {
        const remaining = input.slice(i);
        const char = input[i];

        if (/\s/.test(char)) {
            i++;
            continue;
        }

        // Numbers: 10, 3.14, .5
        const number = remaining.match(
            /^(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?/
        );

        if (number) {
            tokens.push({
                type: "number",
                value: Number(number[0])
            });

            i += number[0].length;
            continue;
        }

        // Variables: a, total, num1, student_marks
        const identifier = remaining.match(
            /^[a-zA-Z_][a-zA-Z0-9_]*/
        );

        if (identifier) {
            tokens.push({
                type: "identifier",
                value: identifier[0]
            });

            i += identifier[0].length;
            continue;
        }

        // Operators and parentheses
        const operator = remaining.match(
            /^(?:\*\*|[+\-*/%()])/
        );

        if (operator) {
            tokens.push({
                type: "operator",
                value: operator[0]
            });

            i += operator[0].length;
            continue;
        }

        throw new Error(
            `Invalid character "${char}" at position ${i + 1}.`
        );
    }

    tokens.push({ type: "EOF", value: "" });

    return tokens;
}

// ==========================================
// PARSER
// ==========================================

class Parser {
    constructor(tokens) {
        this.tokens = tokens;
        this.position = 0;
    }

    current() {
        return this.tokens[this.position];
    }

    consume() {
        return this.tokens[this.position++];
    }

    match(value) {
        if (this.current().value === value) {
            this.consume();
            return true;
        }

        return false;
    }

    parse() {
        if (this.current().type === "EOF") {
            throw new Error("Enter an expression first.");
        }

        const result = this.parseAdditive();

        if (this.current().type !== "EOF") {
            throw new Error(
                `Unexpected token "${this.current().value}".`
            );
        }

        return result;
    }

    parseAdditive() {
        let node = this.parseMultiplicative();

        while (["+", "-"].includes(this.current().value)) {
            const operator = this.consume().value;
            const right = this.parseMultiplicative();

            node = {
                type: "BinaryExpression",
                operator,
                left: node,
                right
            };
        }

        return node;
    }

    parseMultiplicative() {
        let node = this.parseUnary();

        while (["*", "/", "%"].includes(this.current().value)) {
            const operator = this.consume().value;
            const right = this.parseUnary();

            node = {
                type: "BinaryExpression",
                operator,
                left: node,
                right
            };
        }

        return node;
    }

    parseUnary() {
        if (["+", "-"].includes(this.current().value)) {
            const operator = this.consume().value;

            return {
                type: "UnaryExpression",
                operator,
                argument: this.parseUnary()
            };
        }

        return this.parsePower();
    }

    parsePower() {
        const left = this.parsePrimary();

        if (this.match("**")) {
            return {
                type: "BinaryExpression",
                operator: "**",
                left,
                right: this.parseUnary()
            };
        }

        return left;
    }

    parsePrimary() {
        const token = this.current();

        if (token.type === "number") {
            this.consume();

            return {
                type: "NumberLiteral",
                value: token.value
            };
        }

        if (token.type === "identifier") {
            this.consume();

            return {
                type: "Identifier",
                name: token.value
            };
        }

        if (this.match("(")) {
            const node = this.parseAdditive();

            if (!this.match(")")) {
                throw new Error("Missing closing parenthesis.");
            }

            return node;
        }

        throw new Error(
            `Unexpected token "${token.value || "end of expression"}".`
        );
    }
}

function buildAST(expression) {
    return new Parser(tokenize(expression)).parse();
}

// ==========================================
// SYNTAX TREE RENDERING
// ==========================================

function createTreeNode(node) {
    const wrapper = document.createElement("div");
    wrapper.className = "tree-visual-node";

    const label = document.createElement("div");
    label.className = "tree-node-label";

    if (node.type === "NumberLiteral") {
        label.textContent = String(node.value);
        label.classList.add("number-node");
    } else if (node.type === "Identifier") {
        label.textContent = node.name;
        label.classList.add("identifier-node");
    } else {
        label.textContent = node.operator;
        label.classList.add("operator-node");
    }

    wrapper.appendChild(label);

    let children = [];

    if (node.type === "BinaryExpression") {
        children = [node.left, node.right];
    } else if (node.type === "UnaryExpression") {
        children = [node.argument];
    }

    if (children.length) {
        wrapper.classList.add("has-children");

        const childContainer = document.createElement("div");
        childContainer.className = "tree-children";

        children.forEach((child) => {
            childContainer.appendChild(createTreeNode(child));
        });

        wrapper.appendChild(childContainer);
    }

    return wrapper;
}

function renderTree(ast) {
    const output = $("#tree-output");

    if (!output) {
        throw new Error("Syntax tree output container was not found.");
    }

    output.replaceChildren();
    output.classList.remove("empty-state");

    const tree = createTreeNode(ast);

    // Ensure the tree is visible even if some CSS rules are missing.
    output.style.display = "flex";
    output.style.justifyContent = "center";
    output.style.alignItems = "flex-start";
    output.style.overflowX = "auto";
    output.style.padding = "35px 15px";
    output.style.minHeight = "140px";

    tree.style.display = "flex";
    tree.style.flexDirection = "column";
    tree.style.alignItems = "center";

    output.appendChild(tree);
}

// ==========================================
// THREE-ADDRESS CODE GENERATION
// ==========================================

function generateTAC(ast) {
    const instructions = [];
    let tempCount = 0;

    function generate(node) {
        if (node.type === "NumberLiteral") {
            return String(node.value);
        }

        if (node.type === "Identifier") {
            return node.name;
        }

        if (node.type === "UnaryExpression") {
            const argument = generate(node.argument);
            const temp = `t${++tempCount}`;

            instructions.push(
                `${temp} = ${node.operator}${argument}`
            );

            return temp;
        }

        if (node.type === "BinaryExpression") {
            const left = generate(node.left);
            const right = generate(node.right);
            const temp = `t${++tempCount}`;

            instructions.push(
                `${temp} = ${left} ${node.operator} ${right}`
            );

            return temp;
        }

        throw new Error("Could not generate intermediate code.");
    }

    const result = generate(ast);
    instructions.push(`result = ${result}`);

    return instructions;
}

// ==========================================
// EXPRESSION DESCRIPTION
// ==========================================

function describeExpression(ast) {
    if (ast.type === "NumberLiteral") {
        return `Number: ${ast.value}`;
    }

    if (ast.type === "Identifier") {
        return `Variable: ${ast.name}`;
    }

    if (ast.type === "UnaryExpression") {
        return `Unary operator: ${ast.operator}`;
    }

    if (ast.type === "BinaryExpression") {
        return `Operator: ${ast.operator}`;
    }

    return "Expression";
}

function countNodes(ast) {
    if (ast.type === "BinaryExpression") {
        return 1 + countNodes(ast.left) + countNodes(ast.right);
    }

    if (ast.type === "UnaryExpression") {
        return 1 + countNodes(ast.argument);
    }

    return 1;
}

// ==========================================
// SHOW TRANSLATION OUTPUT
// ==========================================

function renderTranslation(ast) {
    const codeOutput = $("#code-output");
    const details = $("#translation-details");

    const instructions = generateTAC(ast);

    if (codeOutput) {
        codeOutput.textContent = instructions.join("\n");
    }

    if (details) {
        details.replaceChildren();

        const items = [
            `Expression: ${getExpressionForDetails()}`,
            `Syntax tree nodes: ${countNodes(ast)}`,
            `Generated instructions: ${instructions.length}`,
            describeExpression(ast)
        ];

        items.forEach((item) => {
            const line = document.createElement("p");
            line.textContent = item;
            details.appendChild(line);
        });
    }
}

let currentExpression = "";

function getExpressionForDetails() {
    return currentExpression;
}

// ==========================================
// SYNTAX TREE FORM
// ==========================================

function handleTreeSubmit(event) {
    event.preventDefault();

    const input = $("#tree-expression");
    const status = $("#tree-status");

    try {
        if (!input || !input.value.trim()) {
            throw new Error("Please enter an expression.");
        }

        const ast = buildAST(input.value.trim());

        renderTree(ast);

        if (status) {
            status.textContent = "Tree generated successfully";
        }

        hideError();
    } catch (error) {
        if (status) {
            status.textContent = "Invalid expression";
        }

        showError(error.message);
    }
}

// ==========================================
// TRANSLATION FORM
// ==========================================

function handleTranslationSubmit(event) {
    event.preventDefault();

    const input = $("#translation-expression");

    try {
        if (!input || !input.value.trim()) {
            throw new Error("Please enter an expression.");
        }

        currentExpression = input.value.trim();

        const ast = buildAST(currentExpression);

        renderTranslation(ast);

        hideError();
    } catch (error) {
        showError(error.message);
    }
}

// ==========================================
// EXAMPLE BUTTONS
// ==========================================

function loadExample(button) {
    const expression = button.dataset.expression;

    if (!expression) return;

    const explorer = button.closest("#explorer");
    const translation = button.closest("#translation");

    if (explorer) {
        const input = $("#tree-expression");

        if (input) {
            input.value = expression;
        }

        $("#tree-form").requestSubmit();
    } else if (translation) {
        const input = $("#translation-expression");

        if (input) {
            input.value = expression;
        }

        $("#translation-form").requestSubmit();
    }
}

// ==========================================
// INITIALIZE
// ==========================================

document.addEventListener("DOMContentLoaded", () => {
    const treeForm = $("#tree-form");
    const translationForm = $("#translation-form");

    if (treeForm) {
        treeForm.addEventListener("submit", handleTreeSubmit);
    }

    if (translationForm) {
        translationForm.addEventListener(
            "submit",
            handleTranslationSubmit
        );
    }

    document.querySelectorAll(".example-button").forEach((button) => {
        button.addEventListener("click", () => loadExample(button));
    });

    const closeButton = $("#toast-close");

    if (closeButton) {
        closeButton.addEventListener("click", hideError);
    }
});
