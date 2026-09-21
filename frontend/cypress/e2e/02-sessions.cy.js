const fillSession = () => {
  cy.get('[name=name]').type('Evening Yoga');
  cy.get('[name=date]').type('2027-04-20');
  cy.get('[name=teacherId]').select('2');
  cy.get('[name=description]').type('Relax after work.');
};
const card = (name) => cy.contains('h3', name).parent();

describe('Séances — API et persistance réelles', () => {
  it('consulte les détails, participe puis se désinscrit', () => {
    cy.login();
    cy.contains('Create Session').should('not.exist');
    cy.contains('button', 'Delete').should('not.exist');
    card('Morning Yoga').contains('View Details').click();
    cy.contains('Sarah Teacher').should('be.visible');
    cy.contains('A gentle session for everyone.').should('be.visible');
    cy.contains('Join Session').click();
    cy.contains('Leave Session').should('be.visible');
    cy.reload();
    cy.contains('Participants:').parent().should('contain', '1');
    cy.contains('Leave Session').click();
    cy.contains('Join Session').should('be.visible');
    cy.reload();
    cy.contains('Participants:').parent().should('contain', '0');
    cy.contains('Back to Sessions').click();
    cy.location('pathname').should('eq', '/sessions');
  });

  it('crée, recharge, modifie et supprime une séance en administrateur', () => {
    cy.login(true);
    cy.contains('Create Session').click();
    cy.get('button[type=submit]').click();
    cy.get('[name=name]:invalid').should('exist');
    fillSession();
    cy.intercept('POST', '/api/session').as('create');
    cy.get('button[type=submit]').click();
    cy.wait('@create').then(({ request, response }) => {
      expect(request.body.teacherId).to.eq(2);
      expect(response.statusCode).to.eq(201);
    });
    card('Evening Yoga').contains('View Details').click();
    cy.reload();
    cy.contains('Marc Teacher').should('be.visible');
    cy.contains('Edit').click();
    cy.get('[name=name]').should('have.value', 'Evening Yoga').clear().type('Updated Yoga');
    cy.get('[name=date]').should('have.value', '2027-04-20');
    cy.get('[name=teacherId]').should('have.value', '2').select('1');
    cy.get('[name=description]').clear().type('Updated description.');
    cy.contains('Update Session').click();
    card('Updated Yoga').contains('View Details').click();
    cy.reload();
    cy.contains('Updated description.').should('be.visible');
    cy.contains('Sarah Teacher').should('be.visible');
    cy.on('window:confirm', () => false);
    cy.contains('button', 'Delete').click();
    cy.contains('h1', 'Updated Yoga').should('be.visible');
    cy.then(() => { cy.removeAllListeners('window:confirm'); });
    cy.contains('button', 'Delete').click();
    cy.location('pathname').should('eq', '/sessions');
    cy.reload();
    cy.contains('Updated Yoga').should('not.exist');
  });

  it('annule le formulaire et la suppression depuis la liste, puis vide la liste', () => {
    cy.login(true);
    cy.contains('Create Session').click();
    cy.contains('Cancel').click();
    cy.on('window:confirm', () => false);
    card('Morning Yoga').contains('Delete').click();
    card('Morning Yoga').should('exist');
    cy.then(() => { cy.removeAllListeners('window:confirm'); });
    card('Morning Yoga').contains('Delete').click();
    cy.contains('No sessions available').should('be.visible');
    cy.reload();
    cy.contains('No sessions available').should('be.visible');
  });

  for (const route of ['/sessions/create', '/sessions/edit/1']) {
    it(`refuse le formulaire administrateur ${route} à un membre`, () => {
      cy.login();
      cy.visit(route);
      cy.location('pathname').should('eq', '/sessions');
      cy.window().then((win) => {
        cy.request({ method: 'POST', url: '/api/session', failOnStatusCode: false,
          headers: { Authorization: `Bearer ${win.localStorage.getItem('token')}` },
          body: { name: 'Forbidden', date: '2027-01-01', teacherId: 1, description: 'Forbidden' },
        }).its('status').should('eq', 403);
      });
    });
  }

  it('affiche une erreur pour une séance inexistante', () => {
    cy.login();
    cy.visit('/sessions/99999');
    cy.contains('Failed to load session details').should('be.visible');
  });
});

describe('Séances — erreurs réseau simulées', () => {
  it('affiche une erreur de chargement de la liste', () => {
    cy.login();
    cy.intercept('GET', '/api/session', { statusCode: 500 });
    cy.visit('/sessions');
    cy.contains('Failed to load sessions').should('be.visible');
  });

  for (const detail of [false, true]) {
    it(`signale un échec de suppression depuis ${detail ? 'le détail' : 'la liste'}`, () => {
      cy.login(true);
      if (detail) cy.contains('View Details').click();
      cy.intercept('DELETE', '/api/session/1', { statusCode: 500 });
      cy.on('window:alert', cy.stub().as('alert'));
      cy.contains('button', 'Delete').click();
      cy.get('@alert').should('have.been.calledWith', 'Failed to delete session');
      cy.contains('Morning Yoga').should('be.visible');
    });
  }

  it('permet de réessayer après les échecs de participation et de désinscription', () => {
    cy.login();
    cy.contains('View Details').click();
    cy.on('window:alert', cy.stub().as('alert'));
    cy.intercept({ method: 'POST', url: '/api/session/1/participate/2', times: 1 }, { statusCode: 500 });
    cy.contains('Join Session').click();
    cy.get('@alert').should('have.been.calledWith', 'Failed to join session');
    cy.contains('Join Session').click();
    cy.contains('Leave Session').should('be.visible');
    cy.intercept({ method: 'DELETE', url: '/api/session/1/participate/2', times: 1 }, { statusCode: 500 });
    cy.contains('Leave Session').click();
    cy.get('@alert').should('have.been.calledWith', 'Failed to leave session');
    cy.contains('Leave Session').click();
    cy.contains('Join Session').should('be.visible');
  });

  for (const edit of [false, true]) {
    it(`conserve le formulaire après un échec de ${edit ? 'modification' : 'création'}`, () => {
      cy.login(true);
      cy.visit(edit ? '/sessions/edit/1' : '/sessions/create');
      if (edit) cy.get('[name=name]').should('have.value', 'Morning Yoga');
      else fillSession();
      cy.intercept(edit ? 'PUT' : 'POST', edit ? '/api/session/1' : '/api/session', {
        statusCode: 500, body: edit ? { message: 'Save unavailable' } : {}, delay: 500,
      }).as('save');
      cy.get('button[type=submit]').click().should('be.disabled').and('contain', 'Saving...');
      cy.wait('@save');
      cy.contains(edit ? 'Save unavailable' : 'Failed to save session').should('be.visible');
      cy.get('button[type=submit]').should('be.enabled');
      cy.get('[name=name]').should('have.value', edit ? 'Morning Yoga' : 'Evening Yoga');
    });
  }

  it('gère les erreurs de chargement du formulaire', () => {
    cy.login(true);
    cy.intercept('GET', '/api/teacher', { statusCode: 500 });
    cy.intercept('GET', '/api/session/1', { statusCode: 404 });
    cy.visit('/sessions/edit/1');
    cy.contains('Failed to load session').should('be.visible');
    cy.get('[name=teacherId] option').should('have.length', 1);
    cy.contains('Cancel').click();
    cy.contains('h1', 'Yoga Sessions').should('be.visible');
  });
});
