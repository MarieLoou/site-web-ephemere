import { Component } from '@angular/core';
import { EventsComponent } from './events/events.component';
import { HeaderComponent } from './header/header.component';
import { TeamComponent } from './team/team.component';
import { JoinComponent } from './join/join.component';
import { ContactComponent } from './contact/contact.component';
import { HeroComponent } from './hero/hero.component';
import { AboutComponent } from './about/about.component';

@Component({
  selector: 'app-root',
  imports: [EventsComponent, HeaderComponent, TeamComponent, JoinComponent, ContactComponent, HeroComponent, AboutComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'site-web-ephemere';
}
