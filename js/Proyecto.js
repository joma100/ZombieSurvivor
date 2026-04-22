

// Variables globales
var loadingManager;
var loadingScreen;
var loader;
var stats;
var renderer, scene, camera;
var cameraControls;
var angulo = -0.01;
var cameraDistance = 100; 
var cameraHeight = 50;

var islandSize = 100;
var foliagePositions = [];

var mixer; 
var clock = new THREE.Clock();
var currentAnimationIndex = 0;
var actions = {};
var animationNames = [];

// Raycaster horizontal
const raycaster = new THREE.Raycaster();

// Raycaster vertical
const downRaycaster = new THREE.Raycaster();
const downVector = new THREE.Vector3(0, -1, 0);
var gravity = 0;
var walkableObjects = [];

// Raycaster camara
const cameraRaycaster = new THREE.Raycaster();
var hiddenObjects = [];

// Controles jugador
var angulo = -0.01;
var p_pos = new THREE.Vector3(0,0,0);
var player_obj;

const controls = {
    moveForward: false,
    moveBackward: false,
    moveLeft: false,
    moveRight: false,
    isMoving: false,
    isRunning: false,
    isAttacking: false,
    speed: 10,
    runningSpeed: 25
};

// Enemigos
var zombieTemplate;
var activeEnemies = [];
var enemyMixers = [];
var enemySpawnTimer = 0;
const MAX_ENEMIES = 15;
const SPAWN_COOLDOWN = 2.0;

// UI
var gui;
var gameStarted = false;

var menuControls = {
    startGame: function() {
        gameStarted = true;
        gui.hide();
        if (hudElements.container) hudElements.container.style.display = 'block';
    }
};

// HUD
var playerMaxHealth = 100;
var playerHealth = 100;
var playerScore = 0;
var survivalTime = 0;
var hudElements = {};

// Event listeners para controles
document.addEventListener('keydown', (event) => {
    switch (event.code) {
        case 'ArrowUp':
        case 'KeyW':
            controls.moveForward = true;
            break;
        case 'ArrowDown':
        case 'KeyS':
            controls.moveBackward = true;
            break;
        case 'ArrowLeft':
        case 'KeyA':
            controls.moveLeft = true;
            break;
        case 'ArrowRight':
        case 'KeyD':
            controls.moveRight = true;
            break;
        case 'ShiftLeft':
        case 'ShiftRight':
            controls.isRunning = true;
            break;
        case 'Space':
            if (!controls.isAttacking && gameStarted) {
                controls.isAttacking = true;
                setTimeout(() => {
                    controls.isAttacking = false;
                }, 650); 
            }
            break;
    }
});

document.addEventListener('keyup', (event) => {
    switch (event.code) {
        case 'ArrowUp':
        case 'KeyW':
            controls.moveForward = false;
            break;
        case 'ArrowDown':
        case 'KeyS':
            controls.moveBackward = false;
            break;
        case 'ArrowLeft':
        case 'KeyA':
            controls.moveLeft = false;
            break;
        case 'ArrowRight':
        case 'KeyD':
            controls.moveRight = false;
            break;
        case 'ShiftLeft':
        case 'ShiftRight':
            controls.isRunning = false;
            break;
    }
});




// 1-inicializa 
init();
// 2-Crea una escena
loadScene();
// 3-renderiza
render();

function init()
{
    renderer = new THREE.WebGLRenderer();
    renderer.setSize( window.innerWidth, window.innerHeight );
    renderer.setClearColor( new THREE.Color(0xFFFFFF) );
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.getElementById('container').appendChild( renderer.domElement );

    scene = new THREE.Scene();

    var aspectRatio = window.innerWidth / window.innerHeight;
    near_plane = 1;
    camera = new THREE.PerspectiveCamera( 50, aspectRatio , near_plane, 10000 );
    camera.position.set( 50, 530, 30 );

    cameraControls = new THREE.OrbitControls( camera, renderer.domElement );
    cameraControls.target.set( 0, 500, 0 );

    document.getElementById('start-btn').addEventListener('click', function() {
        gameStarted = true;
        document.getElementById('start-screen').style.display = 'none';
        if (hudElements.container) hudElements.container.style.display = 'block';
    });

    applyLoadingLogic();
    createHUD();

    stats = new Stats();
    stats.showPanel(0);
    stats.dom.style.position = 'absolute';
    stats.dom.style.top = 'auto';
    stats.dom.style.bottom = '0px';
    document.body.appendChild(stats.dom);

    window.addEventListener('resize', updateAspectRatio );
}


function loadScene() {

    //Light and shadows
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
    directionalLight.position.set(1250, 4000, 1250);
    directionalLight.castShadow = true;

    const d = 15000; 
    directionalLight.shadow.camera.left = -d;
    directionalLight.shadow.camera.right = d;
    directionalLight.shadow.camera.top = d;
    directionalLight.shadow.camera.bottom = -d;
    directionalLight.shadow.camera.near = 100;
    directionalLight.shadow.camera.far = 20000;
    directionalLight.shadow.mapSize.width = 2048; 
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.bias = -0.0015;

    scene.add(directionalLight);

    //Skybox
    const skyboxLoader = new THREE.GLTFLoader(loadingManager);

    skyboxLoader.load('models/skybox/scene.gltf', 
        function (gltf) {
            const skyboxModel = gltf.scene;
            
            skyboxModel.traverse(function(child) {
                if (child.isMesh && child.material && child.material.map) {
                    child.material = new THREE.MeshBasicMaterial({
                        map: child.material.map,
                        color: 0xffffff,
                        side: THREE.BackSide
                    });
                }
            });

            skyboxModel.scale.set(1000, 1000, 1000);
            skyboxModel.position.set(0, 0, 0);
            scene.add(skyboxModel);
        },
        function ( xhr ) {

            console.log( ( xhr.loaded / xhr.total * 100 ) + '% loaded' );

        },
        function ( error ) {

            console.log( 'An error happened' );

        }
    );
    
    //Floating island
    const islandLoader = new THREE.GLTFLoader(loadingManager);
    
    islandLoader.load('models/floating_island/scene.gltf', 
        function (gltf) {
            const islandModel = gltf.scene;
            
            islandModel.scale.set(islandSize, islandSize, islandSize); 
            islandModel.position.set(0, -5, 0); 
            
            islandModel.traverse(function(child) {
                if (child.isMesh) {
                    child.receiveShadow = true;
                    child.castShadow = true; 
                }
            });

            scene.add(islandModel);

            walkableObjects.push(islandModel);

            const islandBox = new THREE.Box3().setFromObject(islandModel);
            const highestPoint = islandBox.max.y;
            p_pos.y = highestPoint - (islandSize*8);

            loadFoliage();
        },
        function ( xhr ) {

            console.log( ( xhr.loaded / xhr.total * 100 ) + '% loaded' );

        },
        function ( error ) {

            console.log( 'An error happened' );

        }
    );

    loadPlayer();
    loadEnemies();
}

function MakeObstructingObjectsTransparent() {
    if (player_obj == null) return;

    // Restaurar la opacidad
    for (let i = 0; i < hiddenObjects.length; i++) {
        let obj = hiddenObjects[i];
        if (obj.material) {
            if (Array.isArray(obj.material)) {
                obj.material.forEach(m => { m.transparent = false; m.opacity = 1.0; });
            } else {
                obj.material.transparent = false;
                obj.material.opacity = 1.0;
            }
        }
    }

    hiddenObjects = []

    let targetPos = new THREE.Vector3(p_pos.x, p_pos.y + 20, p_pos.z);
    let camToPlayer = new THREE.Vector3().subVectors(targetPos, camera.position);
    let distanceToPlayer = camToPlayer.length();
    camToPlayer.normalize();

    cameraRaycaster.set(camera.position, camToPlayer);
    const intersects = cameraRaycaster.intersectObjects(walkableObjects, true);

    // Convertir objetos a transparentes
    for (let i = 0; i < intersects.length; i++) {
        if (intersects[i].distance < distanceToPlayer) {
            let obj = intersects[i].object;

            if (obj.material) {
                if (Array.isArray(obj.material)) {
                    obj.material.forEach(m => { 
                        m.transparent = true; 
                        m.opacity = 0.3;
                        m.needsUpdate = true;
                    });
                } else {
                    obj.material.transparent = true;
                    obj.material.opacity = 0.3;
                    obj.material.needsUpdate = true;
                }
                hiddenObjects.push(obj);
            }
        }
    }
}

var time = 0;
function update()
{
    time += 0.01;

    // Actualizar la animación de player_obj
    const delta = clock.getDelta();
    if (mixer!=null) mixer.update(delta);

    // HUD
    if (gameStarted) {
        updateHUD(delta);

        if (playerHealth <= 0) {
            gameStarted = false;
            document.getElementById('lose-screen').style.display = 'flex';
            if (hudElements.container) hudElements.container.style.display = 'none';
        } 
        else if (survivalTime >= 60) {
            gameStarted = false;
            document.getElementById('final-score').innerText = "Zombis Eliminados: " + playerScore;
            document.getElementById('win-screen').style.display = 'flex';
            if (hudElements.container) hudElements.container.style.display = 'none';
        }
    }

    // Movimiento jugador
    updatePlayerMovement();

    // Enemigos
    updateEnemies(delta);
    
    // actualiza animación del jugador
    if (player_obj == null) return;
    player_obj.position.set(p_pos.x, p_pos.y, p_pos.z);               
    player_obj.rotation.x = 0;
    player_obj.rotation.z = 0;

    let targetIndex = 0; // 0 (Idle)
    
    if (controls.isAttacking) {
        targetIndex = 3; // 3 (Attack)
    } else if (controls.isMoving) {
        targetIndex = controls.isRunning ? 2 : 1; // 2 (Run), 1 (Walk)
    }

    if (currentAnimationIndex !== targetIndex && animationNames[targetIndex] && animationNames[currentAnimationIndex]) {
        let currentName = animationNames[currentAnimationIndex];
        let targetName = animationNames[targetIndex];

        actions[currentName].fadeOut(0.2);
        actions[targetName].reset().fadeIn(0.2).play();
        
        currentAnimationIndex = targetIndex;
    }

    // actualiza camara
    MakeObstructingObjectsTransparent()
    let cameraZ = p_pos.z + cameraDistance * 1.2;
    let cameraY = p_pos.y + cameraHeight * 3;

    camera.position.set(p_pos.x, cameraY, cameraZ);
    
    camera.lookAt(p_pos.x, p_pos.y + (cameraHeight * 0.5), p_pos.z);
}

function updatePlayerMovement(){
    if (!gameStarted || controls.isAttacking) return;

    let moveX = 0;
    let moveZ = 0;

    if (controls.moveForward) moveZ -= 1;
    if (controls.moveBackward) moveZ += 1;
    if (controls.moveLeft) moveX -= 1;
    if (controls.moveRight) moveX += 1;

    let velocity = new THREE.Vector3(moveX, 0, moveZ);
    controls.isMoving = velocity.lengthSq() > 0;

    if (controls.isMoving) {
        velocity.normalize(); 

        let chestPos = new THREE.Vector3(p_pos.x, p_pos.y + 35, p_pos.z);
        raycaster.set(chestPos, velocity);
        const intersects = raycaster.intersectObjects(walkableObjects, true);

        let currentSpeed = controls.isRunning ? controls.runningSpeed : controls.speed;

        if (intersects.length === 0 || intersects[0].distance > currentSpeed + near_plane + 0.1) {
            p_pos.add(velocity.clone().multiplyScalar(currentSpeed));
        }

        if (player_obj != null) {
            let targetAngle = Math.atan2(velocity.x, velocity.z);
            player_obj.rotation.y = targetAngle; 
        }
    }
    
    let headPos = new THREE.Vector3(p_pos.x, p_pos.y + 50, p_pos.z);
    downRaycaster.set(headPos, downVector);

    const floorIntersects = downRaycaster.intersectObjects(walkableObjects, true);

    if (floorIntersects.length > 0 && floorIntersects[0].distance < 50) {
        gravity = 0; 
        p_pos.y = floorIntersects[0].point.y;
    } else {
        gravity += 0.5; 
        p_pos.y -= gravity;
        
        if (p_pos.y < -400) {
            playerHealth = 0;
        }
    }
}

function render()
{
    stats.begin();

	requestAnimationFrame( render );
	update();

    // vista 3d perspectiva
    renderer.autoClear = false;
    renderer.setViewport(0,0,window.innerWidth,window.innerHeight);
	renderer.setClearColor( new THREE.Color(0xa2a2f2) );
	renderer.clear();
	renderer.render( scene, camera );

    stats.end();
}

function loadPlayer()
{
    const loader = new THREE.FBXLoader(loadingManager);

    // Cargar modelo base
    loader.load('models/player/character.fbx', function (object) {
        player_obj = object;
        player_obj.scale.set(1.5, 1.5, 1.5);
        scene.add(player_obj);

        mixer = new THREE.AnimationMixer(player_obj);
        
        // Ajustar materiales
        player_obj.traverse(function (child) {
            if (child.isMesh) {
                child.material.transparent = false;
                child.material.opacity = 1.0;
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });

        // Cargar espada
        const rightHand = player_obj.getObjectByName("mixamorigRightHand");
        
        if (rightHand != null) {
            loader.load('models/sword/source/Sword_Long_A.fbx', function(swordObject) {
                const texLoader = new THREE.TextureLoader(loadingManager);
                const path = 'models/sword/textures/'; 
                
                const colorMap = texLoader.load(path + 'Sword_Long_15C_BaseColor.png');
                const metalMap = texLoader.load(path + 'Sword_Long_15C_Metallic.png');
                const roughMap = texLoader.load(path + 'Sword_Long_15C_Rough.png');
                const aoMap = texLoader.load(path + 'internal_ground_ao_texture.jpeg');

                const swordMaterial = new THREE.MeshStandardMaterial({
                    map: colorMap,
                    metalnessMap: metalMap,
                    roughnessMap: roughMap,
                    aoMap: aoMap,
                    metalness: 0.3, 
                    roughness: 0.7
                });
                
                swordObject.traverse(function(child) {
                    if (child.isMesh){
                        child.material = swordMaterial;
                        child.castShadow = true;
                        child.receiveShadow = true;
                    }
                });

                rightHand.add(swordObject);

                swordObject.scale.set(1, 1, 1);
                swordObject.position.set(20, 15, -10);
                swordObject.rotation.set(Math.PI / 2, 0, -Math.PI / 5);

            }, undefined, function(error) {
                console.error("Error loading the sword FBX:", error);
            });
        }

        // Cargar y aplicar animaciones
        const animations = [
            'models/player/Idle.fbx', 
            'models/player/Walking.fbx',
            'models/player/Unarmed Run Forward.fbx',
            'models/player/Attack.fbx',
        ];

        animations.forEach(function (animFile, index) {
            loader.load(animFile, function (animData) {
                const name = animFile.split('/').pop().split('.').slice(0, -1).join('.');
                const action = mixer.clipAction(animData.animations[0]);
                actions[name] = action; 
                animationNames[index] = name; 
                
                if (index === 0) { 
                    action.play();
                }                                
            });
        });

        // Ajustar la camara
        var box = new THREE.Box3().setFromObject(player_obj);
        var size = new THREE.Vector3();
        box.getSize(size);

        var maxDim = Math.max(size.x, size.y, size.z);
        var fov = camera.fov * (Math.PI / 180); 
        
        cameraDistance = (maxDim / (2 * Math.tan(fov / 2))) * 3;
        cameraHeight = cameraDistance * 0.5;

        camera.near = cameraDistance / 10; 
        camera.far = cameraDistance * 1000000;  
        camera.updateProjectionMatrix(); 
    }, undefined, function (error) {
        console.error(error);
    });
}

function spawnFoliage(amountToSpawn, template, radius, scale, isSolid = false) {
    const spawnRaycaster = new THREE.Raycaster();
    const downDir = new THREE.Vector3(0, -1, 0);
    
    let spawned = 0;
    let attempts = 0; 

    while (spawned < amountToSpawn && attempts < 2000) {
        attempts++;
        let spawnArea = islandSize * 200;

        let randomX = (Math.random() - 0.5) * spawnArea; 
        let randomZ = (Math.random() - 0.5) * spawnArea;
        let testCenter = new THREE.Vector3(randomX, 2000, randomZ); 

        // Verificar proximidad
        let isTooClose = false;
        for (let i = 0; i < foliagePositions.length; i++) {
            let dist = Math.sqrt(
                Math.pow(randomX - foliagePositions[i].x, 2) + 
                Math.pow(randomZ - foliagePositions[i].z, 2)
            );
            if (dist < (radius + foliagePositions[i].radius)) {
                isTooClose = true;
                break;
            }
        }
        if (isTooClose) continue; 

        // Comprobar terreno
        let testPoints = [
            testCenter,
            new THREE.Vector3(randomX + radius, 2000, randomZ),
            new THREE.Vector3(randomX - radius, 2000, randomZ),
            new THREE.Vector3(randomX, 2000, randomZ + radius),
            new THREE.Vector3(randomX, 2000, randomZ - radius)
        ];

        let isValid = true;
        let groundHeight = null;

        for (let i = 0; i < testPoints.length; i++) {
            spawnRaycaster.set(testPoints[i], downDir);
            let intersects = spawnRaycaster.intersectObjects(walkableObjects, true);

            if (intersects.length === 0) {
                isValid = false;
                break;
            }

            if (i === 0) {
                groundHeight = intersects[0].point.y;
            } else {
                if (Math.abs(intersects[0].point.y - groundHeight) > 1.0) {
                    isValid = false;
                    break;
                }
            }
        }

        // Añadir el foliaje
        if (isValid && groundHeight !== null) {
            foliagePositions.push({
                x: randomX, 
                y: groundHeight, 
                z: randomZ, 
                radius: radius 
            });
            
            let newPlant = template.clone();

            newPlant.position.set(randomX, groundHeight, randomZ);            
            newPlant.scale.set(scale, scale, scale);

            newPlant.updateMatrix();
            newPlant.matrixAutoUpdate = false;

            newPlant.traverse(function(child) {
                    if (child.isMesh && child.material) {
                        if (Array.isArray(child.material)) {
                            child.material = child.material.map(m => m.clone());
                            child.castShadow = true;
                            child.receiveShadow = true; 
                        } else {
                            child.material = child.material.clone();
                            child.castShadow = true;
                            child.receiveShadow = true; 
                        }
                    }
                });

            scene.add(newPlant);
            spawned++;

            if (isSolid === true) {
                walkableObjects.push(newPlant); 
            }
        }
    }

    console.log(`Spawned ${spawned} foliage objects after ${attempts} attempts.`);
}

function loadFoliage(){
    const gltfLoader = new THREE.GLTFLoader(loadingManager);

    gltfLoader.load('models/trees/fir/scene.gltf', function(gltf) {
                let foliage = gltf.scene.children[0].clone();
                foliage.position.set(0, 0, 0);
                foliage.rotation.set(-Math.PI / 2, 0, 0);
                spawnFoliage(30, foliage, 200, 200, true); 
            });

    gltfLoader.load('models/trees/pine/scene.gltf', function(gltf) {
                let foliage = gltf.scene.children[0].clone();
                foliage.position.set(0, 0, 0);
                foliage.rotation.set(-Math.PI / 2, 0, 0);
                spawnFoliage(30, foliage, 200, 300, true); 
            });

    gltfLoader.load('models/flowers/narcissus/scene.gltf', function(gltf) {
                let foliage = gltf.scene.children[0].clone();
                foliage.position.set(0, 0, 0);
                foliage.rotation.set(-Math.PI / 2, 0, 0);
                spawnFoliage(90, foliage, 40, 5); 
            });

    gltfLoader.load('models/flowers/geranium/scene.gltf', function(gltf) {
                let foliage = gltf.scene.children[0].clone(); 
                foliage.position.set(0, 0, 0);
                foliage.rotation.set(-Math.PI / 2, 0, 0);
                spawnFoliage(90, foliage, 40, 70); 
            });

    gltfLoader.load('models/flowers/tulip/scene.gltf', function(gltf) {
                let foliage = gltf.scene.children[0].clone();
                foliage.position.set(0, 0, 0);
                foliage.rotation.set(-Math.PI / 2, 0, 0);
                spawnFoliage(90, foliage, 40, 5); 
            });
}

function applyLoadingLogic(){
    loadingScreen = document.createElement('div');
    loadingScreen.style.position = 'absolute';
    loadingScreen.style.top = '0';
    loadingScreen.style.left = '0';
    loadingScreen.style.width = '100%';
    loadingScreen.style.height = '100%';
    loadingScreen.style.backgroundColor = '#000000';
    loadingScreen.style.color = '#ffffff';
    loadingScreen.style.display = 'flex';
    loadingScreen.style.justifyContent = 'center';
    loadingScreen.style.alignItems = 'center';
    loadingScreen.style.fontFamily = 'Arial, sans-serif';
    loadingScreen.style.fontSize = '30px';
    loadingScreen.style.zIndex = '9999';
    loadingScreen.innerHTML = 'Loading... 0%';
    document.body.appendChild(loadingScreen);

    loadingManager = new THREE.LoadingManager();
    
    let maxProgress = 0;
    loadingManager.onProgress = function(url, itemsLoaded, itemsTotal) {
        let currentProgress = Math.round((itemsLoaded / itemsTotal) * 100);

        if (currentProgress > maxProgress) {
            maxProgress = currentProgress;
        }
        
        loadingScreen.innerHTML = 'Loading... ' + maxProgress + '%';
    };
    
    loadingManager.onLoad = function() {
        if (zombieTemplate) {
            zombieTemplate.position.set(camera.position.x, camera.position.y, camera.position.z - 50);
            scene.add(zombieTemplate);
            renderer.render(scene, camera);
            scene.remove(zombieTemplate);
        }

        loadingScreen.style.display = 'none';
        document.getElementById('start-screen').style.display = 'flex';
    };
}

function loadEnemies() {
    const fbxLoader = new THREE.FBXLoader(loadingManager);

    fbxLoader.load('models/zombie/zombie.fbx', function (object) {
        object.scale.set(1.5, 1.5, 1.5);
        
        object.traverse(child => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });

        object.animations = new Array(4); 
        const animFiles = [
            'models/zombie/Walking.fbx',
            'models/zombie/Running.fbx',
            'models/zombie/Attack.fbx',
            'models/zombie/Death.fbx',
        ];
        
        animFiles.forEach((url, index) => {
            fbxLoader.load(url, (anim) => {
                object.animations[index] = anim.animations[0]; 
            });
        });

        zombieTemplate = object;        
    });
}

function spawnEnemy() {
    if (!zombieTemplate || !zombieTemplate.animations[0] || !zombieTemplate.animations[1] || !zombieTemplate.animations[2] || !zombieTemplate.animations[3] || activeEnemies.length >= MAX_ENEMIES) return;

    const spawnRadiusMin = 600;
    const spawnRadiusMax = 850;

    const angle = Math.random() * Math.PI * 2;
    const distance = spawnRadiusMin + Math.random() * (spawnRadiusMax - spawnRadiusMin);

    let randomX = p_pos.x + Math.cos(angle) * distance;
    let randomZ = p_pos.z + Math.sin(angle) * distance;

    const ray = new THREE.Raycaster(new THREE.Vector3(randomX, 2000, randomZ), new THREE.Vector3(0, -1, 0));
    const intersects = ray.intersectObjects(walkableObjects, true);

    if (intersects.length > 0) {
        let groundHeight = intersects[0].point.y;
        
        let enemy = THREE.SkeletonUtils.clone(zombieTemplate);
        enemy.position.set(randomX, groundHeight + 5, randomZ);
        enemy.userData.gravity = 0;
        
        scene.add(enemy);

        let mixer = new THREE.AnimationMixer(enemy);
        enemy.userData.mixer = mixer;
        enemy.userData.actions = [];
        enemy.userData.currentAnimIndex = 0;
        enemy.userData.isDead = false;
        enemy.userData.deadTimer = 0;
        enemy.userData.isRunning = false;
        enemy.userData.runTimer = 0;
        enemy.userData.isAttacking = false;
        enemy.userData.attackTimer = 0;

        zombieTemplate.animations.forEach((clip, index) => {
            let action = mixer.clipAction(clip);
            if (index === 2 || index === 3) {
                action.setLoop(THREE.LoopOnce, 1);
                action.clampWhenFinished = true; 
            }
            enemy.userData.actions[index] = action;
        });

        if (enemy.userData.actions[0]) enemy.userData.actions[0].play();
        
        activeEnemies.push(enemy);
        enemyMixers.push(mixer);
        
        console.log("Enemy Spawned! Count:", activeEnemies.length);
    }
}

function updateEnemies(delta) {
    if (!gameStarted) return;

    enemySpawnTimer += delta;
    if (enemySpawnTimer >= SPAWN_COOLDOWN) {
        let spawnCount = Math.floor(Math.random() * 5) + 1; 
        
        for (let i = 0; i < spawnCount; i++) {
            spawnEnemy(); 
        }
        
        enemySpawnTimer = 0;
    }

    for (let m of enemyMixers) m.update(delta);

    for (let i = activeEnemies.length - 1; i >= 0; i--) {
        let enemy = activeEnemies[i];

        if (enemy.userData.isDead) {
            enemy.userData.deadTimer += delta;
            if (enemy.userData.deadTimer > 3.0) {
                scene.remove(enemy);
                activeEnemies.splice(i, 1);
            }
            continue;
        }

        let headPos = new THREE.Vector3(enemy.position.x, enemy.position.y + 50, enemy.position.z);
        downRaycaster.set(headPos, downVector);
        const floorHits = downRaycaster.intersectObjects([walkableObjects[0]], true);

        if (floorHits.length > 0 && floorHits[0].distance < 55) {
            enemy.userData.gravity = 0;
            enemy.position.y = floorHits[0].point.y;
        } else {
            enemy.userData.gravity += 0.5;
            enemy.position.y -= enemy.userData.gravity;
            
            if (enemy.position.y < -400) {
                scene.remove(enemy);
                activeEnemies.splice(i, 1);
                continue;
            }
        }
        
        if (player_obj) {
            enemy.lookAt(player_obj.position.x, enemy.position.y, player_obj.position.z);
            let dist = enemy.position.distanceTo(player_obj.position);

            let isHit = false;
            if (controls.isAttacking && dist < 320) {
                let dirToZombie = new THREE.Vector3().subVectors(enemy.position, player_obj.position).normalize();
                let playerForward = new THREE.Vector3(Math.sin(player_obj.rotation.y), 0, Math.cos(player_obj.rotation.y)).normalize();
                
                if (playerForward.dot(dirToZombie) > 0.4) {
                    isHit = true;
                }
            }

            if (isHit) {
                enemy.userData.isDead = true;
                enemy.userData.deadTimer = 0;
                changeZombieAnim(enemy, 3, 0.1); // 3 = Death
                playerScore += 1; 
                continue; 
            }

            if (enemy.userData.isAttacking) {
                enemy.userData.attackTimer -= delta;
                
                if (enemy.userData.attackTimer < 1.6 && !enemy.userData.hasDealtDamage) {
                    if (dist < 120) { 
                        if (survivalTime - (enemy.userData.lastHitTime || 0) > 1.0) {
                            playerHealth -= 10; 
                            enemy.userData.lastHitTime = survivalTime;
                            enemy.userData.hasDealtDamage = true;
                        }
                    } else {
                        enemy.userData.hasDealtDamage = true;
                    }
                }

                if (enemy.userData.attackTimer <= 0) {
                    enemy.userData.isAttacking = false;
                    enemy.userData.hasDealtDamage = false;
                    enemy.userData.currentAnimIndex = -1; 
                }
            }

            if (!enemy.userData.isAttacking && dist < 120) {
                enemy.userData.isAttacking = true;
                enemy.userData.hasDealtDamage = false;
                
                let duration = enemy.userData.actions[2] ? enemy.userData.actions[2].getClip().duration : 1.5;
                enemy.userData.attackTimer = duration + 0.5; 
                
                changeZombieAnim(enemy, 2); // 2 = Attack
            }
            else if (!enemy.userData.isAttacking) {
                let dir = new THREE.Vector3().subVectors(player_obj.position, enemy.position);
                dir.y = 0; 
                dir.normalize();

                if (!enemy.userData.isRunning && Math.random() < 0.005) {
                    enemy.userData.isRunning = true;
                    enemy.userData.runTimer = 1.5; 
                }

                if (enemy.userData.isRunning) {
                    enemy.userData.runTimer -= delta;
                    if (enemy.userData.runTimer <= 0) enemy.userData.isRunning = false;
                    
                    changeZombieAnim(enemy, 1, 0.2); // 1 = Run
                    enemy.position.add(dir.multiplyScalar(controls.runningSpeed * 0.6));
                } else {
                    changeZombieAnim(enemy, 0, 0.2); // 0 = Walk
                    enemy.position.add(dir.multiplyScalar(controls.speed * 0.4)); 
                }
            }
        }
    }
}

function changeZombieAnim(enemy, newAnimIndex) {
    if (enemy.userData.currentAnimIndex === newAnimIndex) return;
    
    let oldAction = enemy.userData.actions[enemy.userData.currentAnimIndex];
    let newAction = enemy.userData.actions[newAnimIndex];
    
    if (oldAction) oldAction.fadeOut(0.2);
    if (newAction) newAction.reset().fadeIn(0.2).play();
    
    enemy.userData.currentAnimIndex = newAnimIndex;
}

function createHUD() {
    const hudContainer = document.createElement('div');
    hudContainer.style.position = 'absolute';
    hudContainer.style.top = '20px';
    hudContainer.style.left = '20px';
    hudContainer.style.color = '#ffffff';
    hudContainer.style.fontFamily = 'Arial, sans-serif';
    hudContainer.style.fontSize = '24px';
    hudContainer.style.textShadow = '2px 2px 4px #000000';
    hudContainer.style.pointerEvents = 'none';
    hudContainer.style.zIndex = '100';
    hudContainer.style.display = 'none';

    hudElements.health = document.createElement('div');
    hudContainer.appendChild(hudElements.health);

    hudElements.score = document.createElement('div');
    hudContainer.appendChild(hudElements.score);

    hudElements.time = document.createElement('div');
    hudContainer.appendChild(hudElements.time);

    document.body.appendChild(hudContainer);
    hudElements.container = hudContainer;
}

function updateHUD(delta) {
    survivalTime += delta;

    let minutes = Math.floor(survivalTime / 60);
    let seconds = Math.floor(survivalTime % 60);
    let timeString = (minutes < 10 ? "0" : "") + minutes + ":" + (seconds < 10 ? "0" : "") + seconds;

    hudElements.time.textContent = '⏱️ Tiempo: ' + timeString;
    hudElements.score.textContent = '💀 Zombis: ' + playerScore;
    
    hudElements.health.textContent = '❤️ Salud: ' + Math.round(playerHealth) + '/' + playerMaxHealth;
    
    let healthPercent = playerHealth / playerMaxHealth;
    if (healthPercent > 0.66) {
        hudElements.health.style.color = '#00ff44';
    } else if (healthPercent > 0.33) {
        hudElements.health.style.color = '#ffaa00';
    } else {
        hudElements.health.style.color = '#ff0000';
    }
}

function updateAspectRatio()
{
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
}