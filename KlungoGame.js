
window.addEventListener('load', function() {
	var res = { length: 0, loaded: 0 }
	res.loadCallback = function() {
		res.loaded ++
		if (res.loaded == res.length) requestAnimationFrame(update)
	}
	res.add = function(key, url) {
		res.length ++
		if (url.indexOf('.png') !== -1) {
			res[key] = new Image()
			res[key].src = url
			res[key].addEventListener('load', res.loadCallback)
		}
		if(url.indexOf('.mp3') !== -1) {
			res[key] = new Audio(url)
			res[key].addEventListener('canplaythrough', res.loadCallback)
		}
	}
	res.addAll = function(obj) {
		for (var k in obj) res.add(k, obj[k])
	}
	
	res.addAll({
		sheet: 'spritesheet.png',
		backdrop: 'backdrop.png',
		bgm: 'bgm.mp3',
		win: 'win.mp3',
		lose: 'lose.mp3',
		credits: 'credits.mp3',
		jump: 'jump.mp3'
	})
	
	res.bgm.loop = true
	res.credits.loop = true
	
	var container = document.getElementById('container')
	var overlay = document.getElementById('overlay')
	var canvas = document.getElementById('canvas')
	var ctx = canvas.getContext('2d')
	
	var GRAVITY = 9.81
	var m_gravity = -0.00001
	
	var State = { MENU: 0, START: 1, PLAY: 2, DEAD: 3, WIN: 4 }
	
	var hero = { cx: 0, x: 0.25, y: 0, dx: 2, dy: 0, jumpForce: -7, canJump: false, state: State.MENU }
	
	var map = [
		4, 4, 52, 62, 53, 5, 0, 3, 4, 6,
		0, 0, 7, 0, 0, 2, 0, 0, 4, 4,
		4, 4, 4, 34, 4, 4, 4, 4, 54, 4,
		604, 4, 4, 4, 4, 4, 4, 4, 4, 4
	]
	
	var time = null
	var stateTime = 0
	
	function changeState(state) {
		hero.state = state
		stateTime = 0
	}
	
	function start() {
		hero.cx = 0
		hero.x = 0.25
		hero.y = 0
		hero.dx = 2.5
		hero.dy = 0
		changeState(State.START)
		res.bgm.currentTime = 0
		res.bgm.play()
	}
	
	function update(currentTime) {
		if (!time) time = currentTime / 1000
		var dt = Math.min(currentTime / 1000 - time, 0.1)
		time = currentTime / 1000
		stateTime += dt
		
		if (hero.state == State.MENU) {
			overlay.style.display = 'flex'
		}else{
			overlay.style.display = 'none'
					
			if (m_gravity < 0.0 && Math.random() > 0.9999) {
				alert("Assertion Failed:\n   (m_gravity < 0.0f)\nLine No: 43\nFile: KlungoGame.js\n\n(Game will now hang)")
			}
			
			if (hero.state == State.PLAY || hero.state == State.WIN) {
				hero.x += hero.dx * dt
			}
			
			if (hero.state == State.PLAY) hero.cx = hero.x - 0.25
			
			var minX = Math.floor(hero.x + 0.375)
			var maxX = Math.floor(hero.x + 0.875)
			
			var groundMin = 8 - (map[minX] % 10)
			var groundMax = 8 - (map[maxX] % 10)
			var enemyMin = groundMin - (Math.floor(map[minX] / 10) % 10) * 0.40625 + 0.03125
			var enemyMax = groundMax - (Math.floor(map[maxX] / 10) % 10) * 0.40625 + 0.03125
			
			var ground = Math.min(groundMin, groundMax)
			var enemy = Math.min(enemyMin, enemyMax)
			var flag = Math.floor(map[minX] / 100) % 100 > 0
			
			if (hero.state != State.DEAD && (hero.y > ground || hero.y > enemy || hero.y > 7.5)) {
				changeState(State.DEAD)
				hero.dy = -3
				res.bgm.pause()
				res.lose.play()
			}
			
			if (hero.state == State.PLAY && flag) {
				changeState(State.WIN)
				hero.dx = 5
				res.bgm.pause()
				res.win.play()
			}
			
			hero.y += hero.dy * dt
			hero.dy += GRAVITY * dt
			
			hero.canJump = false
			
			if (hero.y >= ground) {
				if (hero.state == State.START) changeState(State.PLAY)
				if (hero.state != State.DEAD) {
					hero.y = ground
					hero.dy = 0
					hero.canJump = true
				}
			}
			
			if ((hero.state == State.WIN && stateTime > 2.0) || (hero.state == State.DEAD && stateTime > 3.0)) {
				changeState(State.MENU)
			}
		}
		
		redraw()
		
		requestAnimationFrame(update)
	}
	
	function redraw() {
		if (hero.state == State.MENU) {
			ctx.fillStyle = 'black'
			ctx.fillRect(0, 0, canvas.width, canvas.height)
		}else{
			ctx.translate(Math.round(-hero.cx * 16), 0)
			for (var x = 0; x <= map.length / 10 + 2; x ++) {
				ctx.drawImage(res.backdrop, x * 160, 0)
			}
			ctx.translate(Math.round(hero.cx * 16), 0)
			
			ctx.translate(Math.round(-hero.cx * 32), 0)
			for (var x = 0; x < map.length; x ++) {
				var flag = Math.floor(map[x] / 100) % 100
				var ground = map[x] % 10
				var enemyCount = Math.floor(map[x] / 10) % 10
				
				var y = 8 - ground
				if (y < 8) ctx.drawImage(res.sheet, 0, 0, 32, 32, x * 32, y * 32, 32, 32)
				for (y = 8 - ground + 1; y < 8; y ++) ctx.drawImage(res.sheet, 32, 0, 32, 32, x * 32, y * 32, 32, 32)
				
				y = 7.5 - ground
				for (i = 0; i < enemyCount; i ++) {
					var swap = time % 0.5 > 0.25
					if (i % 2 == 1) swap = !swap
					ctx.drawImage(res.sheet, 0, 32 + ((swap) ? 16 : 0), 64, 16, x * 32 - 32, y * 32 - 13 * i, 64, 16)
				}
				
				y = 8 - flag
				if (y < 8) ctx.drawImage(res.sheet, 0, 64, 64, 32, x * 32, y * 32, 64, 32)
				for (y = 8 - flag + 1; y < 8 - ground; y ++) ctx.drawImage(res.sheet, 0, 96, 32, 32, x * 32, y * 32, 32, 32)
			}
			
			
			ctx.drawImage(res.sheet, 64 + ((time % 0.5 > 0.25) ? 32 : 0), (hero.state == State.DEAD) ? 64 : 0, 32, 64, Math.round(hero.x * 32), (hero.y - 2) * 32, 32, 64)
			
			ctx.translate(Math.round(hero.cx * 32), 0)		
		}
	}
	
	container.addEventListener('mousedown', function (e) {
		if (hero.state == State.MENU && e.target.classList.contains('map')) {
			start()
		}
		if (hero.state == State.PLAY && hero.canJump) {
			hero.dy = hero.jumpForce
			res.jump.play()
			hero.canJump = false
		}
	})
})