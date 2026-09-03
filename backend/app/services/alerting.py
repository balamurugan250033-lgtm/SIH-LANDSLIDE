import logging
import time
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models import models

logger = logging.getLogger(__name__)

# Regional language SMS alert templates tiered by severity
# Tiers:
# - MODERATE: Informational Advisory
# - HIGH: Warning
# - CRITICAL / SEVERE: Emergency / Evacuation Order

SMS_TEMPLATES: Dict[str, Dict[str, str]] = {
    "en": {
        "MODERATE": "⚠️ [LANDSLIDE ADVISORY] {region}: Moderate landslide risk detected. Rainfall: {reason}. Monitor official channels & exercise caution.",
        "HIGH": "🚨 [LANDSLIDE WARNING] {region}: High landslide danger! Heavy rainfall and slope instability detected. Avoid vulnerable hilly roads and steep slopes.",
        "CRITICAL": "🆘 [EMERGENCY EVACUATION] {region}: Critical landslide imminent! Evacuate immediately to designated relief shelters. Call 108 for emergency rescue.",
        "SEVERE": "🆘 [SEVERE DISASTER ALERT] {region}: Severe landslide in progress or imminent! Immediate evacuation mandatory. Follow disaster management directives.",
    },
    "hi": {
        "MODERATE": "⚠️ [भूस्खलन सलाह] {region}: मध्यम भूस्खलन जोखिम। सतर्क रहें और मौसम अपडेट पर ध्यान दें।",
        "HIGH": "🚨 [भूस्खलन चेतावनी] {region}: उच्च भूस्खलन खतरा! भारी बारिश के कारण ढलानों और पहाड़ी रास्तों पर जाने से बचें।",
        "CRITICAL": "🆘 [आपातकालीन निकासी] {region}: अत्यधिक भूस्खलन खतरा! तुरंत सुरक्षित स्थानों पर जाएं। आपातकालीन मदद के लिए 108 डायल करें।",
        "SEVERE": "🆘 [गंभीर आपदा चेतावनी] {region}: गंभीर भूस्खलन का खतरा! तुरंत क्षेत्र खाली करें और आपदा प्रबंधन निर्देशों का पालन करें।",
    },
    "as": {
        "MODERATE": "⚠️ [ভূমিস্খলন সতৰ্কবাৰ্তা] {region}: মধ্যমীয়া ভূমিস্খলনৰ সম্ভাৱনা। সতৰ্ক থাকক আৰু বতৰৰ তথ্য অনুসৰণ কৰক।",
        "HIGH": "🚨 [ভূমিস্খলন সতৰ্কবাণী] {region}: উচ্চ ভূমিস্খলনৰ আশংকা! পাহাৰীয়া পথ আৰু বিপদজনক এঢলীয়া ঠাই পৰিহাৰ কৰক।",
        "CRITICAL": "🆘 [জৰুৰী স্থানান্তৰণ] {region}: মাৰাত্মক ভূমিস্খলনৰ প্ৰত্যক্ষ বিপদ! অবিলম্বে সুৰক্ষিত আশ্ৰয়স্থললৈ স্থানান্তৰিত হওক।",
        "SEVERE": "🆘 [গুৰুতৰ দুৰ্যোগ বাৰ্তা] {region}: চৰম ভূমিস্খলনৰ আশংকা! অবিলম্বে এলেকা ত্যাগ কৰক আৰু প্ৰশাসনৰ নিৰ্দেশনা মানি চলক।",
    },
    "bn": {
        "MODERATE": "⚠️ [ভূমিধস সতর্কতা] {region}: মাঝারি মাত্রার ভূমিধসের ঝুঁকি। অনুগ্রহ করে সতর্ক থাকুন এবং স্থানীয় আপডেট দেখুন।",
        "HIGH": "🚨 [ভূমিধস বিপদ সংকেত] {region}: উচ্চ ভূমিধসের ঝুঁকি! পাহাড়ি ঢাল এবং সংবেদনশীল রাস্তা এড়িয়ে চলুন।",
        "CRITICAL": "🆘 [জরুরী নিরাপদ আশ্রয়] {region}: চরম ভূমিধসের আশঙ্কা! অবিলম্বে নিরাপদ আশ্রয়ে চলে যান। জরুরি নম্বরে যোগাযোগ করুন।",
        "SEVERE": "🆘 [মহাবিপদ সংকেত] {region}: মারাত্মক ভূমিধস আসন্ন! অবিলম্বে এলাকা খালি করুন এবং প্রশাসন নির্দেশ অনুসরণ করুন।",
    },
    "mni": {
        "MODERATE": "⚠️ [CHING TUREK CHEKSHINWA] {region}: Landslide thokkhibagi machum oiba chekshinnaba. Chekshin-thourang loukhatpiyu.",
        "HIGH": "🚨 [CHING TUREK AKIBA] {region}: Wangba ching turek akiba leire! Ching-gi lambishingda chatpanba thadokpiyu.",
        "CRITICAL": "🆘 [KHUDOL THOKLAKPA] {region}: Yamna maru oiba ching turek thadok-u! Safe shelter-da khudakta chengthokpiyu.",
        "SEVERE": "🆘 [LAN-MEI ASUNGBA] {region}: Severe landslide imminent! Khudakta mapham thadoktuna rescue team-ga yengsinbiyu.",
    },
    "khasi": {
        "MODERATE": "⚠️ [KA JINGMAHAM JUR] {region}: Ka jingmaham na ka bynta ka jylliew khyndew ha {region}. To sumar bad sharai.",
        "HIGH": "🚨 [KA JINGMAHAM JINGMA] {region}: Ka jingmaham jur halor ka jylliew khyndew! Ki lad ki lynti lum ki long kiba ma.",
        "CRITICAL": "🆘 [KA JINGPYNHER KYRNIEH] {region}: Mih kyrngah na ki jaka ba ma shaphang ka jylliew khyndew! Leit sha ki jaka rieh ba shngain.",
        "SEVERE": "🆘 [JINGMAHAM BA MAR-IA-MAR] {region}: Ka jingtwad khyndew kaba jur palat! Mih kloi ban pynda ha jaka ba shngain.",
    },
    "mizo": {
        "MODERATE": "⚠️ [LEILASO VENCHHUNG] {region}: Leilaso lian vak lo thleng thei a ni a, fimkhur tur a ni e.",
        "HIGH": "🚨 [LEILASO FMKHURNA] {region}: Leilaso hlauhawm a sang! Tlang kawng leh kham hnaiah kal loh tur.",
        "CRITICAL": "🆘 [INSAWN CHHUAH VAT TUR] {region}: Leilaso hlauhawm tak thleng thei! Hmun him lam pan vat rawh u.",
        "SEVERE": "🆘 [CHHIATNA HLUAHAWM NGEI] {region}: Leilaso lian tak thleng dawn! Rang takin himna hmun pan nghal rawh u.",
    },
    "naga": {
        "MODERATE": "⚠️ [LANDSLIDE ADVISORY] {region}: Moderate landslide risk asey. Hoshiyar thakibi aru update sabole thakibi.",
        "HIGH": "🚨 [LANDSLIDE WARNING] {region}: Dangor landslide danger asey! Pahari rasta khan te najabi aru bachibi.",
        "CRITICAL": "🆘 [EMERGENCY EVACUATION] {region}: Immediate landslide ahibo pare! Safe jaga te bhagibi, help nimite 108 call koribi.",
        "SEVERE": "🆘 [SEVERE HAZARD ALERT] {region}: Danger bishi asey! Jaldi jaga chharibi aru relief camp jabi.",
    },
}


class TwilioAlertService:
    def __init__(self):
        self.account_sid = settings.TWILIO_ACCOUNT_SID
        self.auth_token = settings.TWILIO_AUTH_TOKEN
        self.from_number = settings.TWILIO_FROM_NUMBER
        self._client = None

    def get_client(self):
        """Lazy loader for Twilio client to allow testing with mocked credentials."""
        if self._client is not None:
            return self._client

        if self.account_sid and self.auth_token:
            try:
                from twilio.rest import Client
                self._client = Client(self.account_sid, self.auth_token)
                return self._client
            except Exception as e:
                logger.error(f"Failed to initialize Twilio client: {e}")
                return None
        return None

    def set_client(self, client):
        """Allows injecting mock Twilio client in unit tests."""
        self._client = client

    def format_message(self, region_name: str, risk_level: str, reason: str = "", language: str = "en") -> str:
        """Formats an SMS message with appropriate regional language template and severity tier."""
        lang_templates = SMS_TEMPLATES.get(language.lower(), SMS_TEMPLATES["en"])
        level_key = risk_level.upper() if risk_level.upper() in lang_templates else "HIGH"
        template = lang_templates.get(level_key, SMS_TEMPLATES["en"]["HIGH"])
        clean_reason = reason if reason else "Unstable geological conditions"
        return template.format(region=region_name, reason=clean_reason)

    def send_sms(self, to_number: str, message_body: str, max_retries: int = 2) -> Dict[str, Any]:
        """
        Sends an SMS message via Twilio API with exponential retry logic.
        If credentials are not configured, records as simulated for development/demo.
        """
        if not to_number:
            return {"status": "failed", "error": "No phone number provided", "to": to_number}

        # Normalize phone number (basic formatting)
        phone = to_number.strip()
        if not (phone.startswith("+") or phone.isdigit()):
            return {"status": "failed", "error": f"Invalid phone number format: {to_number}", "to": to_number}

        client = self.get_client()

        # If Twilio is not configured, run in simulation mode
        if not client or not self.from_number:
            logger.info(f"[SIMULATED SMS] To: {phone} | Msg: {message_body[:60]}...")
            return {
                "status": "simulated",
                "sid": f"SM_sim_{int(time.time() * 1000)}",
                "to": phone,
                "message": message_body,
            }

        # Execute with retry logic for network or transient errors
        last_error = None
        for attempt in range(1, max_retries + 1):
            try:
                msg = client.messages.create(
                    to=phone,
                    from_=self.from_number,
                    body=message_body
                )
                logger.info(f"Twilio SMS sent successfully. SID: {msg.sid} to {phone}")
                return {
                    "status": "sent",
                    "sid": msg.sid,
                    "to": phone,
                    "attempt": attempt
                }
            except Exception as e:
                last_error = str(e)
                logger.warning(f"Twilio SMS send attempt {attempt}/{max_retries} failed for {phone}: {e}")
                
                # Check for permanent errors where retries won't help (e.g. invalid number)
                error_msg = str(e).lower()
                if "invalid" in error_msg or "unverified" in error_msg or "authenticate" in error_msg:
                    break
                    
                if attempt < max_retries:
                    time.sleep(0.5 * (2 ** (attempt - 1)))  # Exponential backoff

        return {
            "status": "failed",
            "error": last_error or "Unknown error",
            "to": phone
        }

    def dispatch_alert_sms(
        self,
        db: Session,
        alert: models.Alert,
        region_name: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Broadcasts Twilio SMS alerts to all registered citizens subscribed to the affected region.
        Updates Alert delivery status and recipient confirmation counters in the database.
        """
        # Determine region name
        if not region_name:
            region = db.query(models.Region).filter(models.Region.id == alert.region_id).first()
            region_name = region.name if region else f"Region #{alert.region_id}"

        # Fetch registered users in this region with phone numbers
        subscribers = db.query(models.User).filter(
            models.User.phone_number.isnot(None),
            (models.User.region_id == alert.region_id) | (models.User.region_id.is_(None))
        ).all()

        results = []
        sent_count = 0
        failed_count = 0

        # If no subscribers exist in DB, check if test contacts or fallback is needed
        recipients = subscribers
        if not recipients:
            logger.info(f"No phone subscribers registered for region {alert.region_id}.")

        for user in recipients:
            lang = getattr(user, "preferred_language", "en") or "en"
            msg_text = self.format_message(
                region_name=region_name,
                risk_level=alert.risk_level,
                reason=alert.reason,
                language=lang
            )
            res = self.send_sms(to_number=user.phone_number, message_body=msg_text)
            results.append(res)
            if res["status"] in ["sent", "simulated"]:
                sent_count += 1
            else:
                failed_count += 1

        overall_status = "sent" if sent_count > 0 else ("failed" if failed_count > 0 else "skipped")
        if any(r.get("status") == "simulated" for r in results):
            overall_status = "simulated"

        # Update Alert record in DB
        alert.delivery_status = overall_status
        alert.delivery_channel = "sms"
        alert.sent_count = sent_count
        alert.failed_count = failed_count
        alert.delivery_details = f"Recipients: {len(recipients)}, Sent: {sent_count}, Failed: {failed_count}"

        try:
            db.commit()
            db.refresh(alert)
        except Exception as e:
            logger.error(f"Failed to commit alert delivery status to DB: {e}")

        return {
            "alert_id": alert.id,
            "status": overall_status,
            "sent_count": sent_count,
            "failed_count": failed_count,
            "results": results
        }

    def dispatch_notification_sms(
        self,
        db: Session,
        notification: models.Notification,
        region_name: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Dispatches custom admin notification SMS to subscribers in the region.
        """
        if not region_name:
            region = db.query(models.Region).filter(models.Region.id == notification.region_id).first()
            region_name = region.name if region else f"Region #{notification.region_id}"

        subscribers = db.query(models.User).filter(
            models.User.phone_number.isnot(None),
            (models.User.region_id == notification.region_id) | (models.User.region_id.is_(None))
        ).all()

        sent_count = 0
        failed_count = 0
        results = []

        message_body = f"[{notification.title.upper()}] {region_name}: {notification.message}"

        for user in subscribers:
            res = self.send_sms(to_number=user.phone_number, message_body=message_body)
            results.append(res)
            if res["status"] in ["sent", "simulated"]:
                sent_count += 1
            else:
                failed_count += 1

        status = "sent" if sent_count > 0 else ("failed" if failed_count > 0 else "skipped")
        if any(r.get("status") == "simulated" for r in results):
            status = "simulated"

        notification.delivery_status = status
        notification.delivery_details = f"SMS broadcast sent to {sent_count} subscribers"
        db.commit()

        return {
            "notification_id": notification.id,
            "status": status,
            "sent_count": sent_count,
            "failed_count": failed_count,
            "results": results
        }


alert_service = TwilioAlertService()

