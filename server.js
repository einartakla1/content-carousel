import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs/promises';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Projects directory
const PROJECTS_DIR = join(__dirname, 'projects');
const PROJECTS_INDEX = join(PROJECTS_DIR, 'projects.json');

// Ensure projects directory exists
async function initProjectsDir() {
    try {
        if (!existsSync(PROJECTS_DIR)) {
            await fs.mkdir(PROJECTS_DIR, { recursive: true });
        }
        if (!existsSync(PROJECTS_INDEX)) {
            await fs.writeFile(PROJECTS_INDEX, JSON.stringify({ projects: [] }, null, 2));
        }
    } catch (error) {
        console.error('Error initializing projects directory:', error);
    }
}

// Configure multer for asset uploads
const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        const projectId = String(req.params.id);
        const assetsDir = join(PROJECTS_DIR, projectId, 'assets');
        try {
            await fs.mkdir(assetsDir, { recursive: true });
            cb(null, assetsDir);
        } catch (error) {
            cb(error);
        }
    },
    filename: (req, file, cb) => {
        // Use original filename
        cb(null, file.originalname);
    }
});

const upload = multer({ storage });

// API Routes

// Get all projects
app.get('/api/projects', async (req, res) => {
    try {
        const indexData = await fs.readFile(PROJECTS_INDEX, 'utf-8');
        const { projects } = JSON.parse(indexData);
        res.json({ projects });
    } catch (error) {
        console.error('Error reading projects:', error);
        res.status(500).json({ error: 'Failed to read projects' });
    }
});

// Get a specific project
app.get('/api/projects/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const configPath = join(PROJECTS_DIR, String(id), 'config.json');

        if (!existsSync(configPath)) {
            return res.status(404).json({ error: 'Project not found' });
        }

        const configData = await fs.readFile(configPath, 'utf-8');
        const config = JSON.parse(configData);
        res.json(config);
    } catch (error) {
        console.error('Error reading project:', error);
        res.status(500).json({ error: 'Failed to read project' });
    }
});

// Create a new project
app.post('/api/projects', async (req, res) => {
    try {
        const config = req.body;
        const projectId = String(config.carouselId);

        // Create project directory
        const projectDir = join(PROJECTS_DIR, projectId);
        const assetsDir = join(projectDir, 'assets');
        await fs.mkdir(projectDir, { recursive: true });
        await fs.mkdir(assetsDir, { recursive: true });

        // Save config
        const configPath = join(projectDir, 'config.json');
        await fs.writeFile(configPath, JSON.stringify(config, null, 2));

        // Update projects index
        const indexData = await fs.readFile(PROJECTS_INDEX, 'utf-8');
        const index = JSON.parse(indexData);

        // Check if project already exists in index
        const existingIndex = index.projects.findIndex(p => p.id === projectId);

        // Use carouselName if available, otherwise fall back to customerName
        let displayName = 'Untitled';
        if (config.carouselName) {
            displayName = config.carouselName;
        } else if (config.customerName) {
            displayName = config.customerName;
        }

        const projectMeta = {
            id: projectId,
            name: displayName,
            lastModified: new Date().toISOString()
        };

        if (existingIndex >= 0) {
            index.projects[existingIndex] = projectMeta;
        } else {
            index.projects.push(projectMeta);
        }

        await fs.writeFile(PROJECTS_INDEX, JSON.stringify(index, null, 2));

        res.json({ success: true, project: config });
    } catch (error) {
        console.error('Error creating project:', error);
        res.status(500).json({ error: 'Failed to create project' });
    }
});

// Update a project
app.put('/api/projects/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const config = req.body;

        const projectDir = join(PROJECTS_DIR, String(id));
        if (!existsSync(projectDir)) {
            return res.status(404).json({ error: 'Project not found' });
        }

        // Save config
        const configPath = join(projectDir, 'config.json');
        await fs.writeFile(configPath, JSON.stringify(config, null, 2));

        // Update projects index
        const indexData = await fs.readFile(PROJECTS_INDEX, 'utf-8');
        const index = JSON.parse(indexData);
        const projectIndex = index.projects.findIndex(p => p.id === id);

        if (projectIndex >= 0) {
            // Use carouselName if available, otherwise fall back to customerName
            let displayName = 'Untitled';
            if (config.carouselName) {
                displayName = config.carouselName;
            } else if (config.customerName) {
                displayName = config.customerName;
            }

            index.projects[projectIndex].name = displayName;
            index.projects[projectIndex].lastModified = new Date().toISOString();
            await fs.writeFile(PROJECTS_INDEX, JSON.stringify(index, null, 2));
        }

        res.json({ success: true, project: config });
    } catch (error) {
        console.error('Error updating project:', error);
        res.status(500).json({ error: 'Failed to update project' });
    }
});

// Delete a project
app.delete('/api/projects/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const projectDir = join(PROJECTS_DIR, String(id));

        if (existsSync(projectDir)) {
            await fs.rm(projectDir, { recursive: true, force: true });
        }

        // Update projects index
        const indexData = await fs.readFile(PROJECTS_INDEX, 'utf-8');
        const index = JSON.parse(indexData);
        index.projects = index.projects.filter(p => p.id !== id);
        await fs.writeFile(PROJECTS_INDEX, JSON.stringify(index, null, 2));

        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting project:', error);
        res.status(500).json({ error: 'Failed to delete project' });
    }
});

// Upload asset
app.post('/api/projects/:id/assets', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const { id } = req.params;
        const relativePath = `projects/${String(id)}/assets/${req.file.filename}`;

        res.json({
            success: true,
            filename: req.file.filename,
            path: relativePath,
            url: `/${relativePath}`
        });
    } catch (error) {
        console.error('Error uploading asset:', error);
        res.status(500).json({ error: 'Failed to upload asset' });
    }
});

// Serve assets statically
app.use('/projects', express.static(PROJECTS_DIR));

// Initialize and start server
initProjectsDir().then(() => {
    app.listen(PORT, () => {
        console.log(`🚀 Server running on http://localhost:${PORT}`);
        console.log(`📁 Projects directory: ${PROJECTS_DIR}`);
    });
});
