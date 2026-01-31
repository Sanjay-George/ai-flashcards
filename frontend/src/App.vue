<script setup lang="ts">
import { RouterView } from 'vue-router'
</script>

<template>
    <div id="app">
        <header class="app-header">
            <div class="container">
                <h1>🎴 Flashcards AI</h1>
                <nav>
                    <router-link to="/">Home</router-link>
                    <router-link to="/decks">My Decks</router-link>
                    <router-link to="/create">Create Deck</router-link>
                </nav>
            </div>
        </header>

        <main class="app-main">
            <div class="container">
                <RouterView />
            </div>
        </main>

        <footer class="app-footer">
            <div class="container">
                <p>&copy; 2026 Flashcards AI - Language Learning Assistant</p>
            </div>
        </footer>
    </div>
</template>

<style>
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

#app {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
}

.container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 20px;
    width: 100%;
}

.app-header {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 1.5rem 0;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.app-header h1 {
    font-size: 2rem;
    margin-bottom: 1rem;
}

.app-header nav {
    display: flex;
    gap: 1.5rem;
}

.app-header nav a {
    color: white;
    text-decoration: none;
    font-weight: 500;
    padding: 0.5rem 1rem;
    border-radius: 5px;
    transition: background-color 0.3s;
}

.app-header nav a:hover,
.app-header nav a.router-link-active {
    background-color: rgba(255, 255, 255, 0.2);
}

.app-main {
    flex: 1;
    padding: 2rem 0;
}

.app-footer {
    background: #2d3748;
    color: white;
    padding: 1.5rem 0;
    text-align: center;
    margin-top: auto;
}
</style>
