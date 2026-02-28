# Mapa de Aprendizaje: Moonsforest 🌲
Este documento define la progresión educativa, el vocabulario, y la estructura de cada módulo y lección de la plataforma. La filosofía central es: **Práctica intensiva, repetición espaciada y producción oral constante en una interfaz limpia.**

## Filosofía de Diseño de Lecciones ("Hablan Mucho")
- **Menos adornos, más foco:** Interfaz limpia con botones grandes y textos legibles. Sin animaciones que distraigan.
- **Micro-pasos:** Aprender (1), Repetir (1), Hablar (1). Aprender (2), Hablar (1+2). Aprender (3), Hablar (1+2+3).
- **Validación Estricta:** El niño no avanza si no lo pronuncia correctamente (usando Web Speech API local).
- **Moon como Coach:** Frases preestablecidas de aliento constantes ("Great job!", "Try again", "You sound like a native explorer!").

---

## Módulo 1: Campamento Base (Base Camp)
**Objetivo:** El alumno pierde el miedo a hablar. Aprende a saludar, decir su nombre y estado de ánimo usando la estructura básica del verbo To Be. (Tiempo estimado: 1-2 semanas de práctica diaria).

### Lección 1.1: Los Primeros Sonidos
**Enfoque:** Palabras sueltas. Escuchar y Repetir.
*   **Vocabulario:** Hello, Hi, Goodbye, Bye.
*   **Actividades:**
    1.  **Listen & Click:** Moon dice una palabra ("Hello"). El niño debe elegir la tarjeta de texto correcta ("Hello" vs "Goodbye").
    2.  **Echo Chamber (Hablar):** Aparece "Hello" en pantalla. El niño presiona el micrófono y lo dice. El sistema detecta "hello" (o variaciones fonéticas aceptables) y lo pinta de verde. Moon felicita: *"Excellent!"*
    3.  **Echo Chamber (Hablar):** Aparece "Goodbye". El niño lo lee, el micro captura, si está bien, pasa.
    4.  **Combinación (Hablar):** Se pide al niño decir "Hello" y luego "Goodbye".

### Lección 1.2: ¿Quién soy? (I am)
**Enfoque:** Estructura de 2 partes (Sujeto + Verbo) y vocabulario personal.
*   **Vocabulario:** I / am / a boy / a girl.
*   **Actividades:**
    1.  **Listen & Read:** Aparecen las frases "I am a boy" / "I am a girl". Moon las pronuncia lentamente.
    2.  **Drag & Drop (Armar):** El alumno debe arrastrar las palabras `[ am ]`, `[ I ]`, `[ a boy ]` al orden correcto: `[ I ] + [ am ] + [ a boy ]`.
    3.  **Echo Chamber (Hablar lo nuevo):** Se muestra "I am". El niño debe decirlo. 
    4.  **La Escalera (Hablar Todo):** Moon pide que el niño repase. 
        - Dice: "Hello" (Check ✅)
        - Dice: "I am a boy/girl" (Check ✅)
        - Moon: *"You are doing great!"*

### Lección 1.3: Conociendo a otros (You are / Name)
**Enfoque:** Expansión del pronombre y posesivo básico.
*   **Vocabulario:** You / are / Moon / My name is...
*   **Actividades:**
    1.  **Identificación:** Moon dice "You are Moon". El niño debe identificar a quién se refiere.
    2.  **Drag & Drop (Armar):** Ordenar `[ name ]` `[ is ]` `[ My ]` `[ Hiram ]`.
    3.  **Echo Chamber (Hablar lo nuevo):** Decir en voz alta "My name is [Nombre del niño]". El STT lo captura (usaremos comodines para el nombre propio o pediremos que deletree/escriba su nombre al inicio de la lección para ayudar al STT).
    4.  **La Escalera (Hablar Todo):** 
        - Dice: "Hi" (Check ✅)
        - Dice: "My name is [Nombre]" (Check ✅)
        - Dice: "You are Moon" (Check ✅)

### Lección 1.4: ¿Cómo te sientes? (Feelings)
**Enfoque:** Agregar adjetivos a las estructuras ya dominadas.
*   **Vocabulario:** Happy, Sad, Tired, Ready.
*   **Actividades:**
    1.  **Match Image-Text:** Conectar la carita sonriente con "Happy", la triste con "Sad".
    2.  **Drag & Drop:** "I am happy". "You are sad".
    3.  **Echo Chamber (Hablar):** Leer 4 oraciones en voz alta ("I am ready", "I am tired", etc).
    4.  **La Escalera (Hablar Todo):**
        - "Hello Moon" (Check ✅)
        - "My name is [Nombre]" (Check ✅)
        - "I am a boy/girl" (Check ✅)
        - "I am happy" (Check ✅)
        - Moon: *"Fantastic explorer!"*

### Lección 1.5: La Charla de Fogata (Integración Final)
**Enfoque:** Simulador de conversación fluida. Sin opciones múltiples, solo el micrófono y el cerebro del niño.
*   **Actividad Única (El Chat Guiado):**
    - Moon (Audio): *"Hello explorer!"*
    - Niño (Habla): *"Hi Moon"*
    - Moon (Audio): *"What is your name?"*
    - Niño (Habla): *"My name is Hiram"*
    - Moon (Audio): *"How are you today?"*
    - Niño (Habla): *"I am happy"*
    - Moon (Audio): *"You are ready for the next adventure. Goodbye!"*
    - Niño (Habla): *"Goodbye Moon"*
*   **Resultado:** Al completar esta simulación al 100%, se desbloquea el botón: **"Evalúate con el Guardián ($60)"** para solicitar la videollamada de certificación humana y pasar al Módulo 2.

---
*(Los siguientes módulos se agregarán en iteraciones futuras, siguiendo esta misma curva de progresión e intensidad de repetición oral).*
