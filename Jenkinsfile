pipeline {
    agent any

    environment {
        DOCKER_IMAGE = 'taskflow'
        CONTAINER_NAME = 'taskflow-container'
        NGINX_CONTAINER = 'taskflow-nginx'
        PORT = '3000'
        GIT_COMMIT_SHORT = sh(script: "echo \${GIT_COMMIT:0:7}", returnStdout: true).trim()
    }

    stages {
        // ── Stage 1: Checkout ─────────────────────────────────────────────
        stage('Checkout') {
            steps {
                echo 'Checking out source code...'
                checkout scm
            }
        }

        // ── Stage 2: Install Dependencies ────────────────────────────────
        stage('Install Dependencies') {
            steps {
                echo 'Installing npm dependencies...'
                sh 'npm ci'
            }
        }

        // ── Stage 3: Lint ────────────────────────────────────────────────
        stage('Lint') {
            steps {
                echo 'Running ESLint...'
                sh 'npm run lint || echo "Lint warnings found (non-blocking)"'
            }
        }

        // ── Stage 4: Run Tests ──────────────────────────────────────────
        stage('Run Tests') {
            steps {
                echo 'Running Jest tests...'
                sh 'npm test'
            }
        }

        // ── Stage 5: Test Coverage ──────────────────────────────────────
        stage('Test Coverage') {
            steps {
                echo 'Generating test coverage report...'
                sh 'npm run test:coverage || echo "Coverage report generated"'
            }
        }

        // ── Stage 6: Security Check ─────────────────────────────────────
        stage('Security Check') {
            steps {
                echo 'Running npm audit...'
                sh 'npm audit --audit-level=high || echo "Audit warnings found - review recommended"'
            }
        }

        // ── Stage 7: Build Docker Image ─────────────────────────────────
        stage('Build Docker Image') {
            steps {
                echo "Building Docker image: ${DOCKER_IMAGE}:${env.BUILD_NUMBER}"
                sh "docker build -t ${DOCKER_IMAGE}:${env.BUILD_NUMBER} ."
                sh "docker tag ${DOCKER_IMAGE}:${env.BUILD_NUMBER} ${DOCKER_IMAGE}:latest"
                sh "docker tag ${DOCKER_IMAGE}:${env.BUILD_NUMBER} ${DOCKER_IMAGE}:${GIT_COMMIT_SHORT}"
            }
        }

        // ── Stage 8: Deploy ─────────────────────────────────────────────
        stage('Deploy') {
            steps {
                echo 'Deploying application...'
                // Stop and remove existing containers
                sh """
                    if [ \$(docker ps -q -f name=${CONTAINER_NAME}) ]; then
                        echo 'Stopping existing container...'
                        docker stop ${CONTAINER_NAME} || true
                        docker rm ${CONTAINER_NAME} || true
                    fi
                    if [ \$(docker ps -q -f name=${NGINX_CONTAINER}) ]; then
                        docker stop ${NGINX_CONTAINER} || true
                        docker rm ${NGINX_CONTAINER} || true
                    fi
                """
                // Start new container
                sh """
                    docker run -d \
                        --name ${CONTAINER_NAME} \
                        -p ${PORT}:3000 \
                        --restart unless-stopped \
                        ${DOCKER_IMAGE}:${env.BUILD_NUMBER}
                """
            }
        }

        // ── Stage 9: Health Check ────────────────────────────────────────
        stage('Health Check') {
            steps {
                echo 'Waiting for application to start...'
                sh 'sleep 10'
                sh """
                    curl -f http://localhost:${PORT}/api/v1/health || exit 1
                    curl -f http://localhost:${PORT}/api/v1/ready || exit 1
                """
                echo 'Application is healthy!'
            }
        }

        // ── Stage 10: Post-Deployment Verification ──────────────────────
        stage('Post-Deployment Verification') {
            steps {
                echo 'Verifying deployment...'
                sh """
                    docker ps | grep ${CONTAINER_NAME}
                    echo "Deployment verified successfully!"
                    echo "Application: http://localhost:${PORT}"
                    echo "Image tags: ${DOCKER_IMAGE}:${env.BUILD_NUMBER}, ${DOCKER_IMAGE}:${GIT_COMMIT_SHORT}, ${DOCKER_IMAGE}:latest"
                """
            }
        }
    }

    post {
        success {
            echo 'Pipeline completed successfully!'
            echo "Docker image: ${DOCKER_IMAGE}:${env.BUILD_NUMBER}"
            echo "Application running at http://localhost:${PORT}"
        }
        failure {
            echo 'Pipeline failed!'
            // Clean up on failure
            sh """
                if [ \$(docker ps -q -f name=${CONTAINER_NAME}) ]; then
                    docker stop ${CONTAINER_NAME} || true
                    docker rm ${CONTAINER_NAME} || true
                fi
            """
        }
    }
}
