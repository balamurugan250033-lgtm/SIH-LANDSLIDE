const TIPS = [
  { icon: '🏠', title: 'Know the Warning Signs', text: 'Look for cracks in the ground, tilting trees, sagging fences, and sudden changes in water flow. These can indicate an impending landslide.' },
  { icon: '🌧️', title: 'During Heavy Rainfall', text: 'Be extra alert during and after heavy rains. Water saturation is the primary trigger for landslides in hilly areas.' },
  { icon: '📱', title: 'Stay Connected', text: 'Ensure your mobile device has emergency contacts saved. Enable notifications for landslide alerts from local authorities.' },
  { icon: '🚶', title: 'Evacuation Routes', text: 'Know at least two evacuation routes from your area. Move away from the slide path, not just downhill.' },
  { icon: '🔊', title: 'Listen for Warning Sounds', text: 'A faint rumbling sound or unusual noise from the ground may precede a landslide. Do not ignore it.' },
  { icon: '🏥', title: 'Emergency Kit', text: 'Keep an emergency kit with water, food, medicines, flashlight, and important documents ready at all times.' },
  { icon: '📢', title: 'Follow Official Advisories', text: 'Heed evacuation orders immediately. Do not wait to see if the situation improves.' },
  { icon: '📡', title: 'Use This App', text: 'Check this app regularly for real-time risk levels, alerts, and road status before traveling in hilly regions.' },
];

const EMERGENCY_CONTACTS = [
  { icon: '🚨', name: 'Unified Emergency', number: '112', description: 'Police, fire, and medical emergency' },
  { icon: '🚑', name: 'Ambulance', number: '108', description: 'Medical emergency and ambulance service' },
  { icon: '🚒', name: 'Fire & Rescue', number: '101', description: 'Fire, rescue, and disaster response' },
  { icon: '👮', name: 'Police', number: '100', description: 'Police assistance and immediate danger' },
  { icon: '🌐', name: 'Disaster Management', number: '1078', description: 'National disaster management helpline' },
];

export default function SafetyScreen() {
  return (
    <div className="panel">
      <div className="panel-header">
        <h2>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          Safety Guidelines
        </h2>
        <span className="panel-badge">Important</span>
      </div>
      <div className="safety-tips">
        {TIPS.map((tip, i) => (
          <div key={i} className="tip">
            <div className="tip-icon">{tip.icon}</div>
            <div>
              <strong>{tip.title}</strong>
              <p>{tip.text}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="emergency-contacts">
        <div className="emergency-contacts-header">
          <div>
            <h3>Emergency Contacts</h3>
            <p>Tap a number to call the service.</p>
          </div>
          <span className="emergency-badge">India</span>
        </div>
        <div className="emergency-contact-list">
          {EMERGENCY_CONTACTS.map((contact) => (
            <a key={contact.number} className="emergency-contact" href={`tel:${contact.number}`}>
              <span className="emergency-contact-icon">{contact.icon}</span>
              <span className="emergency-contact-copy">
                <strong>{contact.name}</strong>
                <small>{contact.description}</small>
              </span>
              <span className="emergency-contact-number">{contact.number}</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
