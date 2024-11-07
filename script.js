// ==========================================================================
// DOM Elements
// ==========================================================================
const UI = {
    elements: {
        fileTree: document.getElementById('fileList'),
        content: document.getElementById('content'),
        themeToggle: document.getElementById('themeToggle'),
        themeIcon: document.querySelector('#themeToggle i'),
        home: document.querySelector('.home-link'),
        search: document.getElementById('fileSearch'),
        readingProgress: document.createElement('div')
    },

    initializeProgress() {
        this.elements.readingProgress.className = 'reading-progress';
        document.querySelector('.viewer').appendChild(this.elements.readingProgress);
        document.querySelector('.viewer').addEventListener('scroll', () => {
            this.updateReadingProgress();
        });
    },

    updateReadingProgress() {
        const viewer = document.querySelector('.viewer');
        const scrolled = viewer.scrollTop;
        const maxScroll = viewer.scrollHeight - viewer.clientHeight;
        const progress = Math.min(Math.round((scrolled / maxScroll) * 100), 100);
        this.elements.readingProgress.textContent = `${progress}%`;
    },

    clearSelection() {
        document.querySelectorAll('.file-item.selected')
            .forEach(item => item.classList.remove('selected'));
    }
};

// ==========================================================================
// Theme Management
// ==========================================================================
const ThemeManager = {
    set(isDark) {
        document.body.setAttribute('data-theme', isDark ? 'dark' : 'light');
        UI.elements.themeIcon.className = `ph-fill ph-${isDark ? 'moon' : 'sun'}`;
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
    },

    initialize() {
        const savedTheme = localStorage.getItem('theme');
        this.set(savedTheme ? savedTheme === 'dark' : true);
    }
};

// ==========================================================================
// File Management
// ==========================================================================
const FileManager = {
    async loadFile(filePath) {
        try {
            const response = await fetch(filePath);
            if (!response.ok) throw new Error('File not found');
            
            const buffer = await response.arrayBuffer();
            const text = new TextDecoder('windows-1252').decode(buffer);
            
            this.renderContent(text);
            window.scrollTo(0, 0);
        } catch (error) {
            UI.elements.content.innerHTML = `<p class="error">${error.message}</p>`;
        }
    },

    renderContent(text) {
        marked.setOptions({ breaks: true, gfm: true });
        UI.elements.content.innerHTML = marked.parse('```\n' + text + '\n```');
    }
};

// ==========================================================================
// Tree View Management
// ==========================================================================
const TreeView = {
    async initialize() {
        try {
            const response = await fetch('/structure');
            const structure = await response.json();
            this.buildTree(structure, UI.elements.fileTree);
        } catch (error) {
            console.error('Failed to load directory structure:', error);
        }
    },

    buildTree(structure, parent, path = '') {
        const sortedEntries = this.sortEntries(structure);
        
        sortedEntries.forEach(([name, content]) => {
            const item = document.createElement('div');
            item.className = 'tree-item';
            
            if (this.isDirectory(content)) {
                this.createDirectory(item, name, content, path);
            } else if (Array.isArray(content)) {
                this.createFiles(item, content, path);
            }
            
            parent.appendChild(item);
        });
    },

    sortEntries(structure) {
        return Object.entries(structure).sort(([a, contentA], [b, contentB]) => {
            const isObjA = this.isDirectory(contentA);
            const isObjB = this.isDirectory(contentB);
            return isObjA === isObjB ? 
                a.localeCompare(b, undefined, {numeric: true}) : 
                isObjA ? -1 : 1;
        });
    },

    isDirectory(content) {
        return typeof content === 'object' && !Array.isArray(content);
    },

    createDirectory(container, name, content, path) {
        const header = document.createElement('div');
        header.className = 'tree-header';
        
        const label = document.createElement('span');
        label.className = this.getDirectoryClass(path);
        label.textContent = name;
        
        const isRoot = path === '';
        const initialArrow = isRoot ? '▼' : '▶';
        header.innerHTML = `<span class="toggle">${initialArrow}</span>`;
        header.appendChild(label);
        
        const children = document.createElement('div');
        children.className = `tree-children${isRoot ? '' : ' collapsed'}`;
        
        container.appendChild(header);
        container.appendChild(children);
        
        this.buildTree(content, children, `${path}${name}/`);
        this.addToggleHandler(header, children);
    },

    getDirectoryClass(path) {
        return `label ${
            path === '' ? 'root-directory' : 
            path === 'ezines/' ? 'main-directory' : ''
        }`;
    },

    addToggleHandler(header, children) {
        header.onclick = e => {
            e.stopPropagation();
            const toggle = header.querySelector('.toggle');
            toggle.textContent = toggle.textContent === '▶' ? '▼' : '▶';
            children.classList.toggle('collapsed');
        };
    },

    createFiles(container, files, path) {
        files.sort((a, b) => a.localeCompare(b, undefined, {numeric: true}))
            .forEach(file => {
                const element = document.createElement('div');
                element.className = 'file-item';
                element.textContent = file;
                element.onclick = () => {
                    UI.clearSelection();
                    element.classList.add('selected');
                    FileManager.loadFile(`${path}${file}`);
                };
                container.appendChild(element);
            });
    }
};

// ==========================================================================
// Search Functionality
// ==========================================================================
const Search = {
    filter(term) {
        const searchTerm = term.toLowerCase();
        document.querySelectorAll('.tree-item').forEach(item => {
            const hasMatch = this.checkFiles(item, searchTerm);
            item.style.display = hasMatch || !term ? 'block' : 'none';
        });
    },

    checkFiles(item, term) {
        let hasMatch = false;
        item.querySelectorAll('.file-item').forEach(file => {
            const matches = file.textContent.toLowerCase().includes(term);
            file.style.display = matches ? 'block' : 'none';
            if (matches) hasMatch = true;
        });
        return hasMatch;
    }
};

// ==========================================================================
// Welcome Screen
// ==========================================================================
const Welcome = {
    show() {
        UI.elements.content.innerHTML = `
            <div class="welcome-message">
            <pre>
    ▒███████▒ ██▓ ███▄    █ ▓█████     ▄▄▄       ▄████▄    
    ▒ ▒ ▒ ▄▀░▓██▒ ██ ▀█   █ ▓█   ▀    ▒████▄    ▒██▀ ▀█    
    ░ ▒ ▄▀▒░ ▒██▒▓██  ▀█ ██▒▒███      ▒██  ▀█▄  ▒▓█    ▄   
    ▄▀▒   ░░██░▓██▒  ▐▌██▒▒▓█  ▄    ░██▄▄▄▄██ ▒▓▓▄ ▄██▒  
    ▒███████▒░██░▒██░   ▓██░░▒████▒    ▓█   ▓██▒▒ ▓███▀ ░  
    ░▒▒ ▓░▒░▒░▓  ░ ▒░   ▒ ▒ ░░ ▒░ ░    ▒▒   ▓▒█░░ ░▒ ▒  ░  
    ░░▒ ▒ ░ ▒ ▒ ░░ ░░   ░ ▒░ ░ ░  ░     ▒   ▒▒ ░  ░  ▒     
    ░ ░ ░ ░ ░ ▒ ░   ░   ░ ░    ░        ░   ▒   ░          
    ░ ░     ░           ░    ░  ░           ░  ░░ ░        
    ░                                           ░          
            </pre>
                <p>8R0wzE 4ND Re4d ZiNez IN 5tyLe 龴ↀ◡ↀ龴</p>
            </div>
        `;
    }
};

// ==========================================================================
// Initialize Application
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
    ThemeManager.initialize();
    UI.elements.themeToggle.onclick = () => 
        ThemeManager.set(document.body.getAttribute('data-theme') !== 'dark');
    UI.elements.home.onclick = Welcome.show;
    UI.elements.search.oninput = e => Search.filter(e.target.value.trim());
    
    UI.initializeProgress();
    Welcome.show();
    TreeView.initialize();
}); 