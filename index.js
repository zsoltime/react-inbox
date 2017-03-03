class App extends React.Component {
	constructor(props) {
		super(props);

		this.state = {
      activeEmail: null,
			activeFolder: '',
      counts: {},
			emails: [],
			newEmails: [],
		};

    this.fetchNewEmails = true;
	}
  componentDidMount() {
    fetch('http://databro.com/16043/inbox.json')
    .then(res => res.json())
    .then(emails => emails.sort((a, b) => {
      return new Date(b.date) - new Date(a.date);
    }))
    .then(emails => {
      this.setState({ emails }, this.openFolder);
    });

    fetch('http://databro.com/16045/newemails.json')
    .then(res => res.json())
    .then(newEmails => { this.setState({ newEmails }); });

    const onTimeout = () => {
      if (!this.fetchNewEmails) { return; }

      const timeout = Math.random() * 45e3;
      console.log(`You'll receive your next email in ${Math.floor(timeout / 1e3)} seconds`);

      this.pullRandomEmail();
      setTimeout(onTimeout, timeout);
    };

    (onTimeout)();
  }
  pullRandomEmail() {
    this.setState(state => {
      if (!state.newEmails.length) { return state; }

      const newEmail = Object.assign(
        {},
        state.newEmails[Math.floor(Math.random() * state.newEmails.length)],
        { date: new Date().toISOString() }
      );

      return {
        emails: [newEmail, ...state.emails],
      };
    });
  }
	openFolder(folder = 'inbox') {
		this.setState(state => {
      if (folder !== state.activeFolder) {
        const activeEmail = state.emails.find(email => email.tag === folder);
        if (activeEmail) {
          this.markAsRead(activeEmail.id.$oid);
        }
        return {
    			activeFolder: folder,
          activeEmail: activeEmail ? activeEmail.id.$oid : null,
    		}
      }
    });
	}
	openMessage(id) {
    this.setState({
      activeEmail: id,
    });
    clearTimeout(this.timeoutId);
		this.timeoutId = setTimeout(() => this.markAsRead(id), 3000);
	}
  markAsRead(id) {
    this.setState(state => {
      const emails = state.emails.map(email => {
        if (email.id.$oid === id) {
          return Object.assign({}, email, { read: true });
        }
        return email;
      });
      return { emails };
    })
  }
	deleteMessage(id) {
		this.setState( state => {
      const emails = this.state.emails.map(email => {
        if (email.id.$oid === id) {
          return Object.assign({}, email, { tag: 'trash' });
        }
        return email;
      });
      const activeEmail = emails.find(email => email.tag === state.activeFolder);

      return {
        activeEmail: activeEmail ? activeEmail.id.$oid : null,
  			emails,
  		};
    });
	}
  deleteMessagePermanent(id) {
		this.setState( state => {
      const emails = this.state.emails.filter(email => email.id.$oid !== id);
      const activeEmail = emails.find(email => email.tag === state.activeFolder);

      return {
        activeEmail: activeEmail ? activeEmail.id.$oid : null,
  			emails,
  		};
    });
  }
	render() {
    const { emails, activeEmail, activeFolder } = this.state;
    const emailList = emails.filter(email => email.tag === activeFolder);
		const currentEmail = emails.find(email => email.id.$oid === activeEmail);

    const counts = emails.reduce((messages, msg) => {
      if (!msg.read && msg.tag === 'inbox') { messages.unread += 1; }
      if (msg.tag in messages) {
        messages[msg.tag] += 1;
      } else {
        messages[msg.tag] = 1;
      }
      return messages;
    }, { unread: 0 });

		return (
			<div className="app">
				<Sidebar
          activeFolder={activeFolder}
					counts={counts}
					openFolder={folder => { this.openFolder(folder); }}
				/>
        <div className="inbox-container">
  				<EmailList
  					activeEmail={activeEmail}
  					activeFolder={activeFolder}
            emails={emailList}
            onClickEvent={id => { this.openMessage(id); }}
  				/>
  				<EmailDetails
  					email={currentEmail}
            activeFolder={activeFolder}
  					onDelete={id => { this.deleteMessage(id); }}
  					onDeletePermanent={id => { this.deleteMessagePermanent(id); }}
  				/>
				</div>
			</div>
		);
	}
}

const SidebarItem = ({ count, isActive, name, onClickEvent }) => (
  <li className="sidebar__item">
    <button
      className={`btn btn--folder${isActive ? ' btn--active' : ''}`}
      onClick={onClickEvent}
    >
      <span className="sidebar__name">{name}</span>
      <span className="sidebar__count">{count}</span>
    </button>
  </li>
);

const Sidebar = ({ activeFolder, counts, openFolder }) => (
	<div className="sidebar">
		<div className="sidebar__compose">
			<button className="btn btn--compose">Compose Mail</button>
		</div>
		<ul className="sidebar__nav">
      <SidebarItem
        count={counts.unread || 0}
        isActive={activeFolder === 'inbox'}
        name={'inbox'}
				onClickEvent={() => { openFolder('inbox') }}
      />
			<SidebarItem
        count={counts.spam || 0}
        isActive={activeFolder === 'spam'}
        name={'spam'}
				onClickEvent={() => { openFolder('spam') }}
      />
			<SidebarItem
        count={counts.sent || 0}
        isActive={activeFolder === 'sent'}
        name={'sent'}
				onClickEvent={() => { openFolder('sent') }}
      />
			<SidebarItem
        count={counts.draft || 0}
        isActive={activeFolder === 'draft'}
        name={'draft'}
				onClickEvent={() => { openFolder('draft') }}
      />
			<SidebarItem
        count={counts.trash || 0}
        isActive={activeFolder === 'trash'}
        name={'trash'}
				onClickEvent={() => { openFolder('trash') }}
      />
		</ul>
	</div>
);

const EmailListItem = ({ email, onEmailClicked, active }) => {
  const classes = `email${active ? ' email--active' : ''}${!email.read ? ' email--unread' : ''}`;
  const dateOptions = {
    year: undefined,
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: undefined,
  };

  return (
  	<div
  		className={classes}
      onClick={() => { onEmailClicked(email.id.$oid); }}
  	>
      {!email.read &&
    		<div className="email__unread-dot" />
      }
  		<div className="email__details">
        <span className="email__sender truncate">{email.sender}</span>
        <span className="email__time truncate">{
          new Date(email.date).toLocaleString('en-GB', dateOptions)
        }</span>
  		</div>
      <div className="email__subject truncate">{email.subject}</div>
  	</div>
  );
};

const EmailDetails = ({ email, activeFolder, onDelete, onDeletePermanent }) => {
	if (!email) {
		return (<div className="email-content email-content--empty">
      No email selected
		</div>);
	}
  const dateOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: undefined,
  };

	return (
		<div className="email-content">
      <header className="email-content__header">
        <div className="email-content__sender">
          <strong>{
            (activeFolder === 'sent' || activeFolder === 'draft')
              ? 'Zsolt Meszaros'
              : email.sender
            }</strong>
          <span>{
            new Date(email.date).toLocaleString('en-GB', dateOptions)
          }</span>
        </div>
        <div className="email-content__recipient">
          <span>To: {
              (activeFolder === 'sent') ? email.sender : 'me'
            } <a href="#" onClick={e => e.preventDefault()}>Show details</a></span>
        </div>
        <div className="email-content__subject">
          <h3 className="email-content__title">{email.subject}</h3>
          <button
            className="btn btn--delete"
            onClick={() => (email.tag === 'trash'
              ? onDeletePermanent(email.id.$oid)
              : onDelete(email.id.$oid))}
          />
        </div>
      </header>
			<div className="email-content__message">{email.message}</div>
		</div>
	);
};

const EmailList = ({ emails, onClickEvent, activeEmail }) => {
	if (emails.length === 0) {
		return (
			<div className="email-list email-list--empty">
				Nothing to see here
			</div>
		);
	}

  const emailList = emails.map(email => (
    <EmailListItem
      key={email.id.$oid}
      onEmailClicked={id => { onClickEvent(id); }}
      email={email}
      active={activeEmail === email.id.$oid}
    />
));

	return (
		<div className="email-list">
			{emailList}
		</div>
	);
};

ReactDOM.render(<App />, document.getElementById('inbox'));
