const fillLogin = (email = 'user@e2e.test', password = 'test!1234') => {
  cy.get('#email').type(email);
  cy.get('#password').type(password);
};
const fillRegister = (email = 'new@e2e.test') => {
  cy.get('[name=firstName]').type('Alice');
  cy.get('[name=lastName]').type('Martin');
  cy.get('[name=email]').type(email);
  cy.get('[name=password]').type('test!1234');
};

describe('Inscription et connexion — API réelle', () => {
  it('crée un compte, persiste le profil et conserve la connexion après rechargement', () => {
    cy.visit('/');
    cy.location('pathname').should('eq', '/login');
    cy.contains('Register here').click();
    cy.get('button[type=submit]').click();
    cy.get('[name=firstName]:invalid').should('exist');
    fillRegister();
    cy.intercept('POST', '/api/auth/register').as('register');
    cy.get('button[type=submit]').click();
    cy.wait('@register').its('response.statusCode').should('eq', 201);
    cy.location('pathname').should('eq', '/sessions');
    cy.contains('Profile').click();
    cy.contains('Alice').should('be.visible');
    cy.contains('new@e2e.test').should('be.visible');
    cy.reload();
    cy.contains('My Profile').should('be.visible');
    cy.contains('Logout').click();
    cy.location('pathname').should('eq', '/login');
    cy.window().then((win) => {
      expect(win.localStorage.getItem('token')).to.be.null;
      expect(win.localStorage.getItem('user')).to.be.null;
    });
    fillLogin('new@e2e.test');
    cy.get('button[type=submit]').click();
    cy.contains('Yoga Sessions').should('be.visible');
  });

  it('valide le format de l’email et refuse un mot de passe trop court via l’API', () => {
    cy.visit('/register');
    fillRegister('invalid-email');
    cy.get('button[type=submit]').click();
    cy.get('[name=email]').then(($input) => expect($input[0].validity.typeMismatch).to.eq(true));
    cy.get('[name=email]').clear().type('valid@e2e.test');
    cy.intercept('POST', '/api/auth/register').as('invalidPassword');
    cy.get('[name=password]').should('have.attr', 'minlength', '8').clear().type('short');
    cy.get('button[type=submit]').click();
    // Cypress types synthetic events: assert the real API validation as well.
    cy.wait('@invalidPassword').its('response.statusCode').should('eq', 400);
    cy.contains('Too small:').should('be.visible');
    cy.location('pathname').should('eq', '/register');
    cy.window().then((win) => expect(win.localStorage.getItem('token')).to.be.null);
  });

  it('refuse un email déjà inscrit et propose le retour à la connexion', () => {
    cy.visit('/register');
    fillRegister('user@e2e.test');
    cy.get('button[type=submit]').click();
    cy.contains('Email already exists').should('be.visible');
    cy.get('button[type=submit]').should('be.enabled');
    cy.contains('Login here').click();
    cy.location('pathname').should('eq', '/login');
  });

  it('valide les champs puis affiche les identifiants incorrects et permet une nouvelle tentative', () => {
    cy.visit('/login');
    cy.get('button[type=submit]').click();
    cy.get('#email:invalid').should('exist');
    fillLogin('user@e2e.test', 'incorrect');
    cy.get('button[type=submit]').click();
    cy.contains('Invalid credentials').should('be.visible');
    cy.get('#password').clear().type('test!1234');
    cy.get('button[type=submit]').click();
    cy.contains('h1', 'Yoga Sessions').should('be.visible');
  });

  for (const route of ['/sessions', '/sessions/1', '/sessions/create', '/sessions/edit/1', '/profile']) {
    it(`protège ${route} sans authentification`, () => {
      cy.visit(route);
      cy.location('pathname').should('eq', '/login');
      cy.get('nav').contains('Register').should('be.visible');
    });
  }
});

describe('Authentification — erreurs réseau simulées', () => {
  for (const page of ['login', 'register']) {
    it(`${page} affiche un message de repli et désactive le bouton pendant la requête`, () => {
      cy.intercept('POST', `/api/auth/${page}`, { statusCode: 500, body: {}, delay: 500 }).as('failure');
      cy.visit(`/${page}`);
      if (page === 'login') fillLogin(); else fillRegister();
      cy.get('button[type=submit]').click().should('be.disabled');
      cy.wait('@failure');
      cy.contains(page === 'login' ? 'Login failed' : 'Registration failed').should('be.visible');
      cy.get('button[type=submit]').should('be.enabled');
    });
  }
  it('nettoie une session dont les données locales sont corrompues', () => {
    cy.visit('/profile', { onBeforeLoad(win) {
      win.localStorage.setItem('token', 'invalid');
      win.localStorage.setItem('user', '{broken');
    } });
    cy.location('pathname').should('eq', '/login');
    cy.window().its('localStorage.length').should('eq', 0);
  });
});
