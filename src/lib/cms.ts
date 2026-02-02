
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

// Helper to interact with File System (Dev) or GitHub API (Prod)

export type CMSFile = {
    slug: string;
    path: string;
    content: string; // Markdown body
    data: any; // Frontmatter
    sha?: string; // For GitHub updatess
}

const REPO_OWNER = 'Broslunas';
const REPO_NAME = 'veredillas-fm';

export async function listFiles(collection: string, token?: string): Promise<{slug: string, title?: string}[]> {
    const isProd = import.meta.env.PROD;
    
    if (isProd) {
        if (!token) throw new Error("Unauthorized: No GitHub Token");
        
        // Use GitHub API
        const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/src/content/${collection}`;
        const res = await fetch(url, {
             headers: { 
                 'Authorization': `Bearer ${token}`,
                 'Accept': 'application/vnd.github.v3+json'
             }
        });
        
        if (!res.ok) return [];
        
        const files = await res.json();
        return files
            .filter((f: any) => f.name.endsWith('.md'))
            .map((f: any) => ({
                slug: f.name.replace('.md', ''),
                name: f.name
            }));
    } else {
        // Local FS
        const dir = path.join(process.cwd(), 'src/content', collection);
        if (!fs.existsSync(dir)) return [];
        
        const files = fs.readdirSync(dir);
        return files
            .filter(f => f.endsWith('.md'))
            .map(f => ({
                slug: f.replace('.md', '')
            }));
    }
}

export async function getFile(collection: string, slug: string, token?: string): Promise<CMSFile | null> {
    const isProd = import.meta.env.PROD;
    const filePath = `src/content/${collection}/${slug}.md`;

    if (isProd) {
        if (!token) throw new Error("Unauthorized");
        
        const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${filePath}`;
        const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
        
        if (!res.ok) return null;
        
        const data = await res.json();
        const rawContent = Buffer.from(data.content, 'base64').toString('utf-8');
        const parsed = matter(rawContent);
        
        return {
            slug,
            path: filePath,
            content: parsed.content,
            data: parsed.data,
            sha: data.sha
        };
    } else {
        const fullPath = path.join(process.cwd(), filePath);
        if (!fs.existsSync(fullPath)) return null;
        
        const rawContent = fs.readFileSync(fullPath, 'utf-8');
        const parsed = matter(rawContent);
        
        return {
           slug,
           path: filePath,
           content: parsed.content,
           data: parsed.data
        };
    }
}

export async function saveFile(collection: string, slug: string, frontmatter: any, content: string, token?: string, sha?: string) {
    const isProd = import.meta.env.PROD;
    const filePath = `src/content/${collection}/${slug}.md`;
    
    // Reconstruct file
    const fileContent = matter.stringify(content, frontmatter);
    
    if (isProd) {
        if (!token) throw new Error("Unauthorized");
        
        const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${filePath}`;
        const body: any = {
            message: `cms: update ${collection}/${slug}`,
            content: Buffer.from(fileContent).toString('base64'),
            committer: {
                name: "Veredillas Bot",
                email: "bot@veredillasfm.es"
            }
        };

        if (sha) {
            body.sha = sha;
        }

        const res = await fetch(url, {
            method: 'PUT',
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });
        
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.message || "Failed to save to GitHub");
        }
        
    } else {
        const fullPath = path.join(process.cwd(), filePath);
        fs.writeFileSync(fullPath, fileContent);
    }
}
