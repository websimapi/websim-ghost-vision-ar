class ARRenderer {
    constructor() {
        this.scene = document.querySelector('a-scene');
        this.ghostContainer = document.querySelector('#ghost-container');
        this.activeGhosts = new Map();
    }

    async renderGhost(ghostData) {
        if (this.activeGhosts.has(ghostData.id)) {
            return; // Ghost already rendered
        }

        try {
            // Generate ghost image
            const ghostImage = await this.generateGhostImage(ghostData);
            
            // Create ghost entity
            const ghostEntity = this.createGhostEntity(ghostData, ghostImage);
            
            // Add to scene
            this.ghostContainer.appendChild(ghostEntity);
            this.activeGhosts.set(ghostData.id, ghostEntity);
            
            // Auto-remove after duration
            setTimeout(() => {
                this.removeGhost(ghostData.id);
            }, this.getGhostDuration(ghostData.scareLevel) * 1000);
            
        } catch (error) {
            console.error('Failed to render ghost:', error);
        }
    }

    async generateGhostImage(ghostData) {
        const ghostPrompts = {
            shadow: "Dark shadowy humanoid figure, translucent black silhouette",
            transparent: "Translucent white ghost figure, ethereal and wispy",
            glowing: "Glowing ghostly figure with blue-white aura",
            child: "Ghost of a small child, innocent but eerie",
            adult: "Adult ghost figure, tall and imposing",
            demonic: "Demonic ghostly entity, red eyes, terrifying"
        };

        const prompt = `${ghostPrompts[ghostData.ghostType] || ghostPrompts.transparent}, ${ghostData.description}, horror style, dark atmosphere`;

        const result = await websim.imageGen({
            prompt: prompt,
            transparent: true,
            aspect_ratio: "3:4"
        });

        return result.url;
    }

    createGhostEntity(ghostData, imageUrl) {
        const entity = document.createElement('a-entity');
        
        // Position relative to camera
        const position = `${ghostData.position.x} ${ghostData.position.y} ${ghostData.position.z}`;
        
        entity.setAttribute('geometry', {
            primitive: 'plane',
            width: 2,
            height: 2.5
        });
        
        entity.setAttribute('material', {
            src: imageUrl,
            transparent: true,
            opacity: 0.8,
            alphaTest: 0.1
        });
        
        entity.setAttribute('position', position);
        entity.setAttribute('look-at', '[camera]');
        
        // Add floating animation
        entity.setAttribute('animation', {
            property: 'position',
            to: `${ghostData.position.x} ${ghostData.position.y + 0.5} ${ghostData.position.z}`,
            loop: true,
            dir: 'alternate',
            dur: 3000,
            easing: 'easeInOutSine'
        });
        
        // Add opacity fade-in
        entity.setAttribute('animation__fadein', {
            property: 'material.opacity',
            from: 0,
            to: 0.8,
            dur: 1000,
            easing: 'easeOutQuad'
        });
        
        // Add scary effects for high scare level
        if (ghostData.scareLevel > 7) {
            entity.setAttribute('animation__shake', {
                property: 'rotation',
                to: '5 0 5',
                loop: true,
                dir: 'alternate',
                dur: 200,
                easing: 'easeInOutQuad'
            });
        }
        
        return entity;
    }

    removeGhost(ghostId) {
        const ghostEntity = this.activeGhosts.get(ghostId);
        if (ghostEntity) {
            // Fade out animation
            ghostEntity.setAttribute('animation__fadeout', {
                property: 'material.opacity',
                to: 0,
                dur: 1000,
                easing: 'easeInQuad'
            });
            
            setTimeout(() => {
                if (ghostEntity.parentNode) {
                    ghostEntity.parentNode.removeChild(ghostEntity);
                }
                this.activeGhosts.delete(ghostId);
            }, 1000);
        }
    }

    getGhostDuration(scareLevel) {
        // Higher scare level = longer duration
        return Math.min(5 + scareLevel, 15); // 5-15 seconds
    }

    clearAllGhosts() {
        this.activeGhosts.forEach((entity, id) => {
            this.removeGhost(id);
        });
    }
}

