// Placement bank. Each level has more items than a block uses, so retakes vary.
// First option is correct. `text` = short reading passage; `say` = listening (text-to-speech).
export const PLACEMENT = {
  a1: [
    { s: 'grammar', q: 'She ___ from Brazil.', o: ['is', 'are', 'am', 'be'] },
    { s: 'grammar', q: '___ you like coffee?', o: ['Do', 'Does', 'Are', 'Is'] },
    { s: 'grammar', q: 'There ___ two banks in my street.', o: ['are', 'is', 'has', 'have'] },
    { s: 'vocabulary', q: 'The opposite of "cheap" is…', o: ['expensive', 'small', 'new', 'easy'] },
    { s: 'vocabulary', q: 'Your mother\'s sister is your…', o: ['aunt', 'cousin', 'niece', 'grandmother'] },
    { s: 'reading', text: 'Hi, I\'m Sam. I live in Leeds with my wife and two children. I work in a hospital. I start at eight, so I get up very early.', q: 'What is true about Sam?', o: ['He has two children.', 'He lives alone.', 'He starts work at ten.', 'He works in a school.'] },
    { s: 'listening', say: 'The museum opens at nine thirty and closes at five.', q: 'When does the museum open?', o: ['9:30', '9:00', '5:00', '5:30'] },
  ],
  a2: [
    { s: 'grammar', q: 'We ___ to Italy last summer.', o: ['went', 'go', 'have gone', 'were go'] },
    { s: 'grammar', q: "Look! It ___ .", o: ["'s raining", 'rains', 'rain', 'raining'] },
    { s: 'grammar', q: 'My sister is ___ than me.', o: ['taller', 'more tall', 'tallest', 'tall'] },
    { s: 'grammar', q: 'How ___ money do you need?', o: ['much', 'many', 'lot', 'few'] },
    { s: 'vocabulary', q: 'I have a ___: my head hurts.', o: ['headache', 'backache', 'sore', 'cold head'] },
    { s: 'reading', text: 'Dear Tom, thanks for the invitation! I\'d love to come to your party, but I\'m visiting my parents that weekend. Maybe we can meet the following Friday? — Kate', q: 'Why can\'t Kate go to the party?', o: ['She is visiting her parents.', 'She is ill.', 'She has to work.', 'She doesn\'t like parties.'] },
    { s: 'listening', say: "I'm going to take the train at six, so I'll arrive in London at about half past eight.", q: 'What time will the speaker arrive?', o: ['about 8:30', 'about 6:00', 'about 8:00', 'about 6:30'] },
  ],
  b1: [
    { s: 'grammar', q: "I've lived here ___ 2015.", o: ['since', 'for', 'from', 'during'] },
    { s: 'grammar', q: 'If I ___ more time, I would learn to play the piano.', o: ['had', 'have', 'would have', 'will have'] },
    { s: 'grammar', q: 'The bridge ___ in 1932.', o: ['was built', 'built', 'is building', 'has built'] },
    { s: 'grammar', q: 'I\'m looking forward to ___ you.', o: ['seeing', 'see', 'saw', 'be seeing'] },
    { s: 'vocabulary', q: '"I felt ___ when I forgot her name." (= avergonzado)', o: ['embarrassed', 'pregnant', 'embarrassing', 'relieved'] },
    { s: 'reading', text: 'Although the company has grown rapidly, its founders insist that they want to keep a relaxed culture. Employees can choose their working hours, as long as they attend the weekly team meeting.', q: 'What is required of employees?', o: ['to attend the weekly meeting', 'to work fixed hours', 'to work from the office', 'to meet the founders'] },
    { s: 'listening', say: "I was walking to the station when I realised I'd left my laptop at the café, so I had to run back to get it.", q: 'What did the speaker do?', o: ['went back to the café', 'caught the train', 'bought a new laptop', 'called the café'] },
  ],
  b2: [
    { s: 'grammar', q: "He didn't come to work. He ___ ill.", o: ['must have been', 'must be', 'should have been', 'can have been'] },
    { s: 'grammar', q: 'If I had taken the job, I ___ in London now.', o: ['would be living', 'would have lived', 'will live', 'had lived'] },
    { s: 'grammar', q: 'She told me that she ___ the report the day before.', o: ['had finished', 'has finished', 'finishes', 'would finish'] },
    { s: 'grammar', q: 'The CEO is expected ___ next month.', o: ['to resign', 'resigning', 'that she resigns', 'resign'] },
    { s: 'vocabulary', q: 'The benefits of the plan clearly ___ the risks.', o: ['outweigh', 'overcome', 'outrun', 'overtake'] },
    { s: 'reading', text: 'Critics were quick to dismiss the film as sentimental. Yet audiences, perhaps weary of cynicism, embraced it, and it went on to become the most successful independent release of the decade.', q: 'What does the text suggest?', o: ['Audiences disagreed with the critics.', 'Critics loved the film.', 'The film was a commercial failure.', 'Audiences were cynical about the film.'] },
    { s: 'listening', say: "Had we known about the strike, we would have booked a different flight. As it was, we spent the night at the airport.", q: 'What happened?', o: ["They didn't know about the strike and got stuck.", 'They changed their flight in time.', 'They cancelled the trip.', 'They booked a hotel near the airport.'] },
  ],
  c1: [
    { s: 'grammar', q: 'Not only ___ late, but he also forgot the documents.', o: ['did he arrive', 'he arrived', 'arrived he', 'he did arrive'] },
    { s: 'grammar', q: "It's high time we ___ a decision.", o: ['made', 'make', 'will make', 'have made'] },
    { s: 'grammar', q: 'The committee recommended that he ___ from his post.', o: ['step down', 'steps down', 'stepped down', 'will step down'] },
    { s: 'vocabulary', q: 'Choose the best hedge: "The data ___ a link between the two."', o: ['appear to indicate', 'prove without doubt', 'totally show', 'obviously demonstrate'] },
    { s: 'vocabulary', q: 'A formal equivalent of "find out" is…', o: ['ascertain', 'uncover up', 'look into out', 'get'] },
    { s: 'reading', text: 'Far from heralding the end of the printed book, e-readers appear to have carved out a niche of their own, coexisting with, rather than supplanting, their paper counterparts.', q: 'What is the main idea?', o: ['E-readers and printed books coexist.', 'E-readers have replaced printed books.', 'Printed books are disappearing.', 'E-readers are a passing trend.'] },
    { s: 'reading', text: 'The minister\'s statement, while ostensibly conciliatory, did little to address the substantive concerns raised by the unions.', q: 'How does the writer view the statement?', o: ['It seemed friendly but avoided the real issues.', 'It fully solved the problem.', 'It was openly hostile.', 'It was supported by the unions.'] },
  ],
};
export const PLACEMENT_LEVELS = ['a1', 'a2', 'b1', 'b2', 'c1'];
