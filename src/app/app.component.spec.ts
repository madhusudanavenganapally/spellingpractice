import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NgIf, FormsModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'meexpmangement';
  wordsInput = '';
  words: string[] = [];
  wordsSet = false;
  currentWordIndex = 0;
  listening = false;
  spokenSpelling = '';
  isCorrect: boolean | null = null;
  showCongrats = false;

  addWords() {
    this.words = this.wordsInput.split(',').map(w => w.trim()).filter(w => w);
    this.wordsSet = true;
    this.currentWordIndex = 0;
    this.isCorrect = null;
    this.spokenSpelling = '';
    this.listening = false;
    this.speakCurrentWord();
    return false;
  }

  startListening() {
    this.listening = true;
    this.spokenSpelling = '';
    this.isCorrect = null;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-IN';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onresult = (event: any) => {
        this.spokenSpelling = event.results[0][0].transcript.replace(/\s+/g, '').toLowerCase();
        const correctSpelling = this.words[this.currentWordIndex].replace(/\s+/g, '').toLowerCase();
        this.isCorrect = this.spokenSpelling === correctSpelling;
        this.listening = false;
        this.speakResult();
      };

      recognition.onerror = () => {
        this.spokenSpelling = 'Could not hear. Try again.';
        this.listening = false;
      };

      recognition.start();
    } else {
      this.spokenSpelling = 'Speech recognition not supported.';
      this.listening = false;
    }
  }

  speakResult() {
    let message = '';
    if (this.isCorrect === true) {
      message = 'Correct!';
    } else if (this.isCorrect === false) {
      message = 'Incorrect. Try again!';
    }

    if (message && 'speechSynthesis' in window) {
      const utter = new SpeechSynthesisUtterance(message);
      utter.lang = 'en-IN';
      utter.onend = () => {
        if (this.isCorrect === true) {
          setTimeout(() => {
            this.currentWordIndex++;
            this.spokenSpelling = '';
            this.isCorrect = null;
            this.listening = false;
            if (this.wordsSet && this.currentWordIndex < this.words.length) {
              this.speakCurrentWord();
            } else if (this.currentWordIndex >= this.words.length) {
              this.speakEndMessage();
            }
          }, 800);
        }
      };
      window.speechSynthesis.speak(utter);
    }
  }

  nextWord() {
    this.currentWordIndex++;
    this.spokenSpelling = '';
    this.isCorrect = null;
    this.listening = false;
    if (this.wordsSet && this.currentWordIndex < this.words.length) {
      this.speakCurrentWord();
    } else if (this.currentWordIndex >= this.words.length) {
      this.speakEndMessage();
    }
  }

  speakCurrentWord() {
    if (this.wordsSet && this.currentWordIndex < this.words.length && 'speechSynthesis' in window) {
      const utter = new SpeechSynthesisUtterance(this.words[this.currentWordIndex]);
      utter.lang = 'en-IN';
      window.speechSynthesis.speak(utter);
    }
  }

  speakEndMessage() {
    if ('speechSynthesis' in window) {
      const utter = new SpeechSynthesisUtterance('Well done! You finished all the words.');
      utter.lang = 'en-IN';
      window.speechSynthesis.speak(utter);
    }
    this.showCongrats = true;
  }

 playAgain() {
    this.reset();
    this.showCongrats = false;
  }

  reset() {
    this.wordsInput = '';
    this.words = [];
    this.wordsSet = false;
    this.currentWordIndex = 0;
    this.spokenSpelling = '';
    this.isCorrect = null;
    this.listening = false;
  }
}
