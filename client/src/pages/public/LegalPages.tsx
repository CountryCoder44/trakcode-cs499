import { Link } from 'react-router-dom';
import InfoPage from './InfoPage';

// Terms of Service, Privacy Policy, Cancellations & refunds, and Contact.
// Written to match how TrakCode actually works today (billing rules, trial,
// founding members, allowances + fair-use limit, account deletion, retention
// schedules, Trak monitoring). Revised 2026-10-12 after an outside review. Keep these in sync
// with the product, and bump TERMS_VERSION (server/src/config/constants.ts)
// whenever the Terms or Privacy Policy change materially.
//
// COMPANY: TrakCode LLC, NJ entity 0451542627 (formed 2026-10-11). MAILING_ADDRESS: not published until a PO box is set up.
const COMPANY = 'TrakCode LLC';
const MAILING_ADDRESS: string | null = null;
const SUPPORT_EMAIL = 'support@trakcode.com';
const UPDATED = 'October 13, 2026';

const Email = () => <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>;

export function TermsPage() {
  return (
    <InfoPage title="Terms of Service" updated={UPDATED}>
      <p>
        These Terms of Service are an agreement between you and {COMPANY} ("TrakCode", "we", "us"), a New Jersey
        limited liability company. They cover your use of trakcode.com and everything on it, including the lessons,
        Practice Mode, the code runner and Trak, our AI tutor. By creating an account or using TrakCode, you agree to
        these Terms and to our <Link to="/privacy">Privacy Policy</Link>.
      </p>

      <h2>1. Who can use TrakCode</h2>
      <ul>
        <li>You must be at least 18 years old and able to enter into a binding contract.</li>
        <li>TrakCode isn't available to anyone under 18 right now. If we learn that an account belongs to someone under 18, we'll close it, delete its data and refund any unused paid time.</li>
      </ul>

      <h2>2. Your account</h2>
      <ul>
        <li>Give accurate information, including an email address you control. We ask you to confirm it before your membership starts.</li>
        <li>An account is for one person. Don't share it or let others use it.</li>
        <li>Keep your password and any linked sign-in accounts (Google, GitHub, LinkedIn) secure. You're responsible for activity on your account.</li>
        <li>Tell us right away at <Email /> if you think someone else has accessed your account.</li>
      </ul>

      <h2 id="membership">3. Membership, trial and billing</h2>
      <ul>
        <li>
          TrakCode is a paid monthly membership. The current price is on our <Link to="/pricing">pricing page</Link> and
          is shown again before you pay. Payments are processed by Stripe. Prices don't include sales tax; where tax
          applies, it's added on top and shown at checkout before you pay.
        </li>
        <li>
          Before you start a trial or membership, we show you the price, when you'll first be charged, that it renews
          every month, and how to cancel. We keep a record of when you agreed to these Terms and which version.
        </li>
        <li>Your membership renews automatically every month, counted from the day your paid membership starts (the end of your free trial, if you had one), until you cancel.</li>
        <li>
          <strong>Free trial.</strong> New members get one 7-day free trial. A payment method is required to start it, and
          you're charged when it ends unless you cancel first. Each person, email address and payment card gets one
          free trial. If you cancel during the trial, you aren't charged and your access ends immediately.
        </li>
        <li>
          <strong>Cancelling.</strong> Cancel anytime in <strong>Billing → Manage subscription</strong>. After the trial,
          you keep access until the end of the month you've already paid for, and you won't be charged again. Except
          where the law requires otherwise, we don't give refunds or credits for partial months. Details are on our{' '}
          <Link to="/refunds">cancellations and refunds</Link> page.
        </li>
        <li>
          <strong>Founding members.</strong> Accounts created during our founding period get 20% off the monthly
          membership price in effect at the time, for as long as they stay members, including if they cancel and come
          back later. The founding period starts at our public launch and ends on the last day of the sixth calendar
          month after it; the exact end date is shown on our <Link to="/pricing">pricing page</Link>. The discount is
          tied to the email address you signed up with. If you need to change that address, email <Email /> and we'll
          move the discount to the new one.
        </li>
        <li id="allowances">
          <strong>Usage allowances.</strong> Membership includes 100 questions to Trak each week (resetting Monday at
          midnight Eastern time) and 20 newly generated practice problems each calendar month (resetting on the 1st at
          midnight Eastern time). The free trial includes 20 Trak questions a day and 5 new practice problems in total.
          Lessons, grading, the code runner and practice problems already in our library aren't limited. A question or
          problem only counts once it's delivered; if something goes wrong on our side and you don't get an answer or a
          problem, it doesn't count. A message our safety screening blocks still counts as a question.
        </li>
        <li>
          <strong>Monthly fair-use limit.</strong> AI is our biggest cost, so each account also has a monthly limit on AI
          processing across Trak and new practice problems combined. Billing shows how much of it you've used as a
          percentage, and the app tells you once you pass 80%. If you reach it, your weekly Trak questions and new
          practice problems pause until the 1st of the next month (Eastern time), and everything else keeps working.
          Tutoring pack questions are never blocked by this limit.
        </li>
        <li>We'll give you notice in the app or by email before we reduce any allowance or limit.</li>
        <li>
          <strong>Tutoring packs.</strong> Members can buy extra Trak questions as a one-time purchase, charged
          immediately. Bought questions are used only after the weekly allowance runs out, and only while you have an
          active membership or trial. They don't expire: if you cancel, any you have left are still there if you
          rejoin. They end when your account is deleted. The founding-member discount doesn't apply to packs. Refunds
          for packs are covered on our <Link to="/refunds">cancellations and refunds</Link> page.
        </li>
        <li>If a payment fails, we may pause your access until it's resolved. If it isn't resolved, your membership may end.</li>
        <li>If we change the price, we'll tell you at least 30 days before the change affects you. You can cancel before it does.</li>
        <li>
          If we shut TrakCode down, or close your account for a reason other than you breaking these Terms, we'll
          refund the unused part of the month you've paid for and any unused tutoring pack questions.
        </li>
      </ul>

      <h2>4. Acceptable use</h2>
      <p>
        You're welcome to use TrakCode for your own learning: take notes, keep copies of your own code, and share the
        code you write (for example on GitHub, or to show an employer). You agree not to:
      </p>
      <ul>
        <li>use TrakCode for anything illegal, harmful, or abusive;</li>
        <li>try to break, overload, or get around our systems, including the code runner, its limits and its isolation;</li>
        <li>run code meant to attack, scan, or gain access to other systems, or to mine cryptocurrency;</li>
        <li>try to get Trak to ignore its safeguards ("jailbreaking"), produce harmful content, or reveal other people's information;</li>
        <li>harass anyone, or post or send content that is hateful, sexual involving minors, or otherwise unlawful;</li>
        <li>access other people's accounts or data, or scrape our site;</li>
        <li>copy, publish, share or sell our lessons, exercises or other course material;</li>
        <li>create multiple accounts to get extra free trials or discounts.</li>
      </ul>

      <h2>5. Trak, our AI tutor</h2>
      <ul>
        <li>
          Trak is an AI, not a person. It's there to help you learn to code, and like any AI it gets things wrong
          sometimes. Its explanations can be incorrect, the practice problems we generate with AI can contain mistakes,
          and code it suggests may have bugs or security problems. Check what it tells you, test code before you rely
          on it, and don't use code from TrakCode in anything important without reviewing it yourself.
        </li>
        <li>
          Trak is designed to decline requests for legal, medical, financial or other professional advice. Don't rely
          on it for that kind of advice.
        </li>
        <li>
          To keep TrakCode safe, messages to Trak are automatically screened, and flagged conversations are reviewed by
          our staff. The <Link to="/privacy">Privacy Policy</Link> explains what happens and when we may report
          something to the authorities.
        </li>
        <li>Misusing Trak can lead to a warning, or to permanent termination of your account and a ban from TrakCode.</li>
      </ul>

      <h2>6. Your code and content</h2>
      <ul>
        <li>The code you write on TrakCode is yours.</li>
        <li>
          You give us permission to store, run, analyze and display your code and other content as needed to provide
          TrakCode to you (for example, running your code, checking it against each exercise's tests on a pass/fail basis,
          showing it in your workspace, and letting Trak help with it).
        </li>
        <li>Your public profile is off unless you turn it on. Pushing your work to GitHub and sharing to LinkedIn happen only when you choose to.</li>
      </ul>

      <h2>7. Our content</h2>
      <p>
        TrakCode's lessons, exercises, Trak, software and branding belong to us or our licensors. While you're a member,
        you may use them for your own personal learning. Section 4 lists what you can and can't do with them.
      </p>

      <h2>8. Other services</h2>
      <p>
        TrakCode connects to services run by other companies, such as Google, GitHub and LinkedIn (for sign-in and
        GitHub pushes) and Stripe (for payments). Your use of those services is also covered by their own terms.
      </p>

      <h2>9. Warnings, termination and account deletion</h2>
      <ul>
        <li>If an account breaks these Terms, puts others at risk, or misuses Trak or the code runner, we may warn you or close the account. Serious or repeated misuse leads to closure.</li>
        <li>If your account is banned, you may not create a new account or use someone else's.</li>
        <li>
          If we close your account for breaking these Terms, your membership ends right away and, except where the law
          requires otherwise, we don't refund any remaining paid time or unused tutoring pack questions.
        </li>
        <li>
          You can delete your account anytime in <strong>Profile → Account</strong>. Deleting it also cancels your
          membership, so you won't be charged again. During a free trial, the trial ends and your account is deleted
          right away. If you've paid for the current month, you keep access until it ends and your account is deleted
          then; you can change your mind before that date. The <Link to="/privacy">Privacy Policy</Link> explains what
          is deleted and what we keep.
        </li>
      </ul>

      <h2>10. Disclaimers</h2>
      <p>
        TrakCode is provided "as is" and "as available". We work hard to keep it accurate and running, but we don't
        promise it will be error-free or uninterrupted, or that it will lead to any particular result such as a job or a
        grade.
      </p>

      <h2>11. Limitation of liability</h2>
      <p>
        To the extent the law allows, TrakCode isn't liable for indirect, incidental, special or consequential damages,
        or for lost data or profits. Our total liability for any claim related to TrakCode is limited to the amount you
        paid us in the 12 months before the claim. Nothing in these Terms limits rights you have under laws that can't be
        waived.
      </p>

      <h2>12. Indemnity</h2>
      <p>
        If you break these Terms or the law while using TrakCode and that leads to a claim against us, you agree to cover
        the reasonable costs of that claim.
      </p>

      <h2>13. Changes to these Terms</h2>
      <p>
        We may update these Terms. If a change is significant, we'll tell you by email or in the app before it takes
        effect. If you keep using TrakCode after that, the updated Terms apply.
      </p>

      <h2>14. Governing law</h2>
      <p>
        These Terms are governed by the laws of the State of New Jersey, without regard to its conflict-of-law rules.
        Any dispute will be handled in the state or federal courts located in New Jersey.
      </p>

      <h2>15. Contact</h2>
      <p>
        Questions about these Terms? Email <Email />.
      </p>
    </InfoPage>
  );
}

export function PrivacyPage() {
  return (
    <InfoPage title="Privacy Policy" updated={UPDATED}>
      <p>
        This Privacy Policy explains what information {COMPANY} ("TrakCode", "we", "us") collects when you use
        trakcode.com, how we use it, how long we keep it, and the choices you have. We don't sell your personal
        information, we don't share it for targeted advertising, and we don't show ads.
      </p>

      <h2>1. What we collect</h2>
      <ul>
        <li>
          <strong>Account details:</strong> your name, email address and password (stored only as a secure hash). If you
          sign in with Google, GitHub or LinkedIn, we receive your name, email and account ID from that service.
        </li>
        <li>
          <strong>Learning activity:</strong> your lesson progress, the code you write and run, your submissions and
          results, your Practice Mode work, and your conversations with Trak. Trak also keeps short notes about what
          you've shared with it, like your learning goals and topics you're comfortable with, so it can pick up where
          you left off.
        </li>
        <li>
          <strong>Connected accounts:</strong> if you connect GitHub, an access token that lets us push your work to your
          GitHub when you ask. If you connect LinkedIn, an access token for sharing (only when you choose to). Tokens are
          stored encrypted.
        </li>
        <li>
          <strong>Billing:</strong> payments are handled by Stripe. We never see or store your full card number. We keep
          your membership status, billing dates, Stripe customer ID, a history of your membership changes (for example,
          trial started, became a member, cancelled) and your tutoring pack purchases.
        </li>
        <li>
          <strong>Usage records:</strong> counts of your Trak questions and new practice problems (for your allowances),
          and how much AI processing each request used (for the fair-use limit and our costs). These contain no message
          content.
        </li>
        <li>
          <strong>Technical information:</strong> IP address, browser and device type, and server logs. We record the IP
          addresses you sign up, sign in and talk to Trak from, to prevent abuse and investigate misuse. We use your
          browser's storage only for things the site needs, like keeping you signed in, remembering your light or dark
          theme, and the early-access code. We don't use advertising or tracking cookies.
        </li>
        <li>
          <strong>Feedback:</strong> messages you send with the Feedback button, the page you were on, your browser
          type and window size, and a screenshot of that page if you choose to add one. A screenshot shows whatever was
          on your screen in TrakCode at the time, so leave it off if something private is showing. We also keep our
          replies to you.
        </li>
        <li>
          <strong>Records we keep about your email address:</strong> whether it has used a free trial, whether it
          qualifies as a founding member, and whether it belongs to an account we closed for misuse. For free trials we
          also keep a card fingerprint from Stripe (a code that identifies a card without revealing its number), so each
          card gets one trial. We also record when you agreed to our Terms and Privacy Policy, and which version.
        </li>
      </ul>

      <h2>2. How we use it</h2>
      <ul>
        <li>To run TrakCode: your account, lessons, Practice Mode, the code runner, pass/fail checks on your code, and Trak.</li>
        <li>To personalize Trak's help based on your progress and what you've told it.</li>
        <li>To bill you and manage your membership, free trial, allowances and founding-member discount.</li>
        <li>To send account emails, such as confirming your email, resetting your password and billing notices.</li>
        <li>To keep TrakCode safe, prevent abuse and fraud, and meet our legal obligations.</li>
        <li>To improve our lessons and features, mostly using aggregated information.</li>
      </ul>

      <h2>3. Trak, AI and safety screening</h2>
      <ul>
        <li>
          Trak is an AI, powered by Anthropic's Claude models. We send Anthropic what's needed for each AI feature: your
          messages to Trak, the code and lesson or problem you're working on, Trak's notes about you, and your recent
          conversation (to write Trak's replies and check them); requests for new practice problems; and your messages
          to Trak for safety screening.
        </li>
        <li>
          Under our commercial agreement, Anthropic doesn't use this data to train its models. Anthropic deletes it
          within 30 days, except that it may keep data longer where needed to enforce its usage policies (for example,
          content its own systems flag) or to comply with the law. Deleting your TrakCode account doesn't delete copies
          a service provider already holds sooner than their own schedule.
        </li>
        <li>
          Each message to Trak is automatically screened for abuse, attempts to get around Trak's safeguards, and
          illegal content. A screening flag isn't a finding that you did anything wrong. Serious messages are blocked
          automatically: Trak doesn't answer them, and you see a short notice instead (or, if you seem to be in crisis,
          where to get help). A member of our staff reviews flagged conversations, and we don't warn you, close your
          account or report anything without that review, except where the law requires us to act faster.
        </li>
        <li>
          If we learn of facts that indicate apparent child sexual exploitation, we report them to the National Center
          for Missing &amp; Exploited Children (NCMEC), as federal law requires, and preserve the report's material as
          the law requires. If we believe someone is in danger of death or serious harm, or we find evidence of a
          serious crime such as a credible threat or an attack on other systems, we may report it to law enforcement.
          In those cases we may share the relevant conversation, account details and IP address. We also share
          information when we receive valid legal process.
        </li>
      </ul>

      <h2>4. Who we share it with</h2>
      <p>We share information only as needed to run TrakCode, with:</p>
      <ul>
        <li>Amazon Web Services, which hosts our servers and data in the United States;</li>
        <li>Anthropic, which powers Trak and our practice problems (see section 3);</li>
        <li>Stripe, which processes payments;</li>
        <li>Google Workspace, which sends our emails;</li>
        <li>Google, GitHub and LinkedIn, when you choose to sign in with or connect them;</li>
        <li>authorities, when the law requires it or to protect people's safety (see section 3);</li>
        <li>a successor or affiliated company if TrakCode is reorganized, merged or sold, which would remain bound by this policy.</li>
      </ul>

      <h2>5. Your public profile</h2>
      <p>
        Your profile is private unless you turn it on in Profile settings. If you do, the information you choose to show
        (like your activity and pushed GitHub projects) is visible to anyone with the link. Search engines like Google
        are asked not to list it unless you also turn on "Let search engines like Google show my profile". If you make
        your profile private, it stops being visible right away, though a search engine may take a few weeks to drop a
        result it already listed.
      </p>

      <h2>6. How long we keep it</h2>
      <ul>
        <li>While your account is open, we keep your account and learning data.</li>
        <li>
          <strong>Deleting your account.</strong> You can ask to delete it anytime (Profile → Account). It's deleted
          right away, or, if you've paid for the current month, when that month ends (see section 9 of the{' '}
          <Link to="/terms">Terms</Link>). On that date we delete your account, progress, code, Practice Mode work,
          conversations with Trak, Trak's notes about you, feedback and screenshots you sent us and our replies,
          connected-account tokens, usage counts and IP log. Copies in
          our server backups and logs are gone within 30 days after that.
        </li>
        <li>
          <strong>Kept after deletion:</strong>
          <ul>
            <li>
              The record linked to your email address: whether it used a free trial, whether it's a founding member, and
              (if we closed it for misuse) the ban. We keep this so the one-trial rule and bans work, and so your founding
              discount follows you if you return. The trial and founding parts are kept indefinitely; a ban is kept for
              as long as it applies.
            </li>
            <li>Card fingerprints used for free trials, indefinitely, for the one-trial-per-card rule.</li>
            <li>
              Billing records (membership changes and tutoring pack purchases) for 7 years, for tax and accounting.
              Stripe keeps its own payment records under its own policies.
            </li>
            <li>
              The date you last agreed to our Terms and Privacy Policy and which version, with the email record above,
              as proof of what you agreed to.
            </li>
            <li>AI usage records without message content, to understand our costs.</li>
          </ul>
        </li>
        <li>
          <strong>IP addresses</strong> linked to your account are kept for 180 days after we last see each one, and
          deleted with your account unless they're part of a safety record.
        </li>
        <li>
          <strong>Safety records</strong> (a flagged message, the few messages before it, the IP address it came from,
          and our review) are kept even if the account is deleted, on this schedule:
          <ul>
            <li>flagged but not yet reviewed: until it's reviewed;</li>
            <li>reviewed and closed with no action: 90 days after the review;</li>
            <li>reviewed and the account was warned or closed: 3 years after the review, to handle repeat misuse;</li>
            <li>reported to an authority: 3 years after the report (at least as long as the law requires);</li>
            <li>needed for an open legal matter: until it's resolved.</li>
          </ul>
          Conversations that were never flagged follow the normal rules above.
        </li>
      </ul>

      <h2>7. Security</h2>
      <p>
        We use encryption in transit (HTTPS), store passwords only as secure hashes, encrypt connected-account tokens,
        run code in isolated containers without internet access, and limit who can access data. No system is perfectly
        secure, but we work to protect your information.
      </p>

      <h2>8. Your choices and rights</h2>
      <ul>
        <li>Update your profile and connected accounts in Profile settings, and disconnect Google, GitHub or LinkedIn anytime.</li>
        <li>Delete your account anytime in <strong>Profile → Account</strong>.</li>
        <li>
          Ask for a copy of your data, a correction, or deletion by emailing <Email /> from the email address on your
          account. To protect your account, we only act on requests we can confirm come from you, and may ask you to
          confirm by email. We'll respond within 30 days, or sooner where local law requires.
        </li>
        <li>
          Depending on where you live (for example, California and other US states), you may have additional rights,
          such as to know what we collect, to correct or delete it, and to not be discriminated against for using those
          rights. Contact us and we'll help. We don't sell personal information or share it for targeted advertising.
        </li>
        <li>
          <strong>Do Not Track.</strong> We don't track you across other websites, so we treat every visitor the same
          whether or not their browser sends a Do Not Track or Global Privacy Control signal.
        </li>
      </ul>

      <h2>9. Age requirement</h2>
      <p>
        TrakCode is for adults 18 and over. We don't knowingly collect personal information from anyone under 18, and
        TrakCode isn't directed to children. If we learn that an account belongs to someone under 18, we'll close it
        and delete its data. If you believe a child is using TrakCode, contact us at <Email />.
      </p>

      <h2>10. Changes to this policy</h2>
      <p>
        We may update this Privacy Policy. If a change is significant, we'll tell you by email or in the app before it
        takes effect.
      </p>

      <h2>11. Contact</h2>
      <p>
        Questions or requests about your privacy? Email <Email />.
      </p>
    </InfoPage>
  );
}

export function RefundsPage() {
  return (
    <InfoPage title="Cancellations & refunds" updated={UPDATED}>
      <p>
        These rules apply except where the law gives you a right to a refund or other remedy; nothing here takes those
        rights away.
      </p>

      <h2>Free trial</h2>
      <p>
        New members get one 7-day free trial. A payment method is required to start it, and you're charged when the trial
        ends unless you cancel first.
      </p>
      <ul>
        <li>Cancel in <strong>Billing → Manage subscription</strong>.</li>
        <li>If you cancel during the trial, you aren't charged and your access ends immediately.</li>
        <li>Each person, email address and payment card gets one free trial, so cancelling means you won't be offered another one. A card that has already been used for a free trial can't start another one, even with a different email.</li>
      </ul>

      <h2>Paid membership</h2>
      <ul>
        <li>Cancel anytime in <strong>Billing → Manage subscription</strong>.</li>
        <li>You keep access until the end of the month you've already paid for, and you won't be charged again.</li>
        <li>We don't give refunds or credits for partial months.</li>
        <li>You can come back anytime by subscribing again from Billing.</li>
        <li>Deleting your account also cancels your membership (see section 9 of the <Link to="/terms">Terms of Service</Link>).</li>
        <li>
          If we close your account for misuse (see section 9 of the <Link to="/terms">Terms of Service</Link>), your
          membership ends right away and there's no refund for the rest of the paid month.
        </li>
        <li>
          If we shut TrakCode down, or close your account for a reason other than misuse, we refund the unused part of
          the month you've paid for.
        </li>
      </ul>

      <h2>Tutoring packs</h2>
      <ul>
        <li>Extra Trak questions are a one-time purchase, charged right away and separate from your membership.</li>
        <li>
          If you haven't used any of a pack's questions, email <Email /> within 7 days of buying it for a full refund.
          Once any of them have been used, the pack can't be refunded.
        </li>
        <li>
          Bought questions don't expire, and can be used whenever you have an active membership or trial. If you cancel,
          they're kept for when you come back.
        </li>
        <li>
          They end if you delete your account or we close it for misuse, and aren't refunded then. If we shut TrakCode
          down or close your account for another reason, we refund any you haven't used.
        </li>
        <li>The founding-member discount doesn't apply to tutoring packs.</li>
      </ul>

      <h2>Founding members</h2>
      <p>
        If you're a founding member, your 20% discount is tied to your email address. It still applies if you cancel and
        come back later, even after deleting your account.
      </p>

      <h2>Billing problems</h2>
      <p>
        If you think you were charged by mistake, or something about a charge looks wrong, please email <Email /> first.
        We'll look into it and make it right, usually faster than a bank dispute. This doesn't limit your right to
        dispute a charge with your bank or card issuer.
      </p>
    </InfoPage>
  );
}

export function ContactPage() {
  return (
    <InfoPage title="Contact us" updated={UPDATED}>
      <p>
        Questions, problems or feedback? Email <Email />. We aim to reply within two business days.
      </p>
      <p>
        TrakCode is made by {COMPANY}, New Jersey, USA.
        {MAILING_ADDRESS && (
          <>
            <br />
            {MAILING_ADDRESS}
          </>
        )}
      </p>
    </InfoPage>
  );
}
