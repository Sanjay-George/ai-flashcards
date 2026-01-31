<script setup lang="ts">
import { RouterLink } from 'vue-router'
</script>

<template>
    <div class="home">
        <div class="hero">
            <h1 class="hero-title">🎴 Welcome to Flashcards AI</h1>
            <p class="hero-subtitle">
                Your intelligent language learning companion powered by AI
            </p>

            <div class="features">
                <div class="feature-card card">
                    <div class="feature-icon">🤖</div>
                    <h3>AI-Powered Creation</h3>
                    <p>Create flashcard decks from text or images using advanced AI</p>
                </div>

                <div class="feature-card card">
                    <div class="feature-icon">💬</div>
                    <h3>Interactive Editing</h3>
                    <p>Refine your decks with natural language instructions</p>
                </div>

                <div class="feature-card card">
                    <div class="feature-icon">📚</div>
                    <h3>Smart Flashcards</h3>
                    <p>Generate contextual questions in Simple or Master mode</p>
                </div>

                <div class="feature-card card">
                    <div class="feature-icon">📈</div>
                    <h3>Progress Tracking</h3>
                    <p>Track your learning progress with mastery scores</p>
                </div>
            </div>

            <div class="cta-buttons">
                <RouterLink to="/create" class="btn btn-primary btn-lg">
                    Create Your First Deck
                </RouterLink>
                <RouterLink to="/decks" class="btn btn-secondary btn-lg">
                    View My Decks
                </RouterLink>
            </div>
        </div>

        <div class="how-it-works">
            <h2>How It Works</h2>
            <div class="steps">
                <div class="step">
                    <div class="step-number">1</div>
                    <h3>Create or Upload</h3>
                    <p>Share text or upload an image of the content you want to learn</p>
                </div>

                <div class="step">
                    <div class="step-number">2</div>
                    <h3>AI Extracts Lexemes</h3>
                    <p>Our AI identifies key terms, meanings, and parts of speech</p>
                </div>

                <div class="step">
                    <div class="step-number">3</div>
                    <h3>Generate Flashcards</h3>
                    <p>Choose Simple or Master mode to create targeted questions</p>
                </div>

                <div class="step">
                    <div class="step-number">4</div>
                    <h3>Study & Master</h3>
                    <p>Practice with flashcards and track your progress</p>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.home {
    max-width: 1200px;
    margin: 0 auto;
}

.hero {
    text-align: center;
    padding: 3rem 0;
}

.hero-title {
    font-size: 3rem;
    margin-bottom: 1rem;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
}

.hero-subtitle {
    font-size: 1.5rem;
    color: #4a5568;
    margin-bottom: 3rem;
}

.features {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 2rem;
    margin-bottom: 3rem;
}

.feature-card {
    text-align: center;
    padding: 2rem;
}

.feature-icon {
    font-size: 3rem;
    margin-bottom: 1rem;
}

.feature-card h3 {
    font-size: 1.25rem;
    margin-bottom: 0.5rem;
    color: #2d3748;
}

.feature-card p {
    color: #718096;
}

.cta-buttons {
    display: flex;
    justify-content: center;
    gap: 1rem;
    flex-wrap: wrap;
}

.btn-lg {
    padding: 1rem 2rem;
    font-size: 1.125rem;
}

.how-it-works {
    margin-top: 5rem;
    padding: 3rem 0;
    background: white;
    border-radius: 12px;
}

.how-it-works h2 {
    text-align: center;
    font-size: 2.5rem;
    margin-bottom: 3rem;
    color: #2d3748;
}

.steps {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 2rem;
    padding: 0 2rem;
}

.step {
    text-align: center;
}

.step-number {
    width: 60px;
    height: 60px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.5rem;
    font-weight: bold;
    margin: 0 auto 1rem;
}

.step h3 {
    font-size: 1.25rem;
    margin-bottom: 0.5rem;
    color: #2d3748;
}

.step p {
    color: #718096;
}
</style>
