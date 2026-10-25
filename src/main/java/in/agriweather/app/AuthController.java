package in.agriweather.app;

import jakarta.servlet.http.HttpSession;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.util.Map;
import java.util.regex.Pattern;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
  private final JdbcTemplate db; private final BCryptPasswordEncoder encoder;
  private static final Pattern EMAIL = Pattern.compile("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$");
  public AuthController(JdbcTemplate db, BCryptPasswordEncoder encoder) { this.db=db; this.encoder=encoder; }
  record RegisterRequest(String name, String email, String password) {}
  record LoginRequest(String email, String password) {}

  @PostMapping("/register")
  @ResponseStatus(HttpStatus.CREATED)
  public Map<String,Object> register(@RequestBody RegisterRequest r, HttpSession session) {
    if (r.name()==null || r.name().trim().length()<2 || r.name().trim().length()>100) throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Enter a name between 2 and 100 characters.");
    String email = r.email()==null ? "" : r.email().trim().toLowerCase();
    if (!EMAIL.matcher(email).matches() || email.length()>190) throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Enter a valid email address.");
    if (r.password()==null || r.password().length()<8) throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Password must be at least 8 characters.");
    if (db.queryForObject("SELECT COUNT(*) FROM farmers WHERE email=?", Integer.class, email)>0) throw new ResponseStatusException(HttpStatus.CONFLICT,"An account with this email already exists. Please log in.");
    db.update("INSERT INTO farmers(full_name,email,password_hash) VALUES(?,?,?)",r.name().trim(),email,encoder.encode(r.password()));
    Long id=db.queryForObject("SELECT id FROM farmers WHERE email=?",Long.class,email);
    session.setAttribute("farmerId",id); session.setAttribute("farmerName",r.name().trim());
    return Map.of("id",id,"name",r.name().trim(),"email",email);
  }
  @PostMapping("/login")
  public Map<String,Object> login(@RequestBody LoginRequest r, HttpSession session) {
    String email=r.email()==null?"":r.email().trim().toLowerCase();
    var rows=db.query("SELECT id,full_name,password_hash FROM farmers WHERE email=?",(rs,n)->Map.of("id",rs.getLong("id"),"name",rs.getString("full_name"),"hash",rs.getString("password_hash")),email);
    if(rows.isEmpty() || r.password()==null || !encoder.matches(r.password(),(String)rows.get(0).get("hash"))) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,"Email or password is incorrect.");
    var f=rows.get(0); session.setAttribute("farmerId",f.get("id")); session.setAttribute("farmerName",f.get("name"));
    return Map.of("id",f.get("id"),"name",f.get("name"),"email",email);
  }
  @GetMapping("/me") public Map<String,Object> me(HttpSession session) {
    Object id=session.getAttribute("farmerId"); if(id==null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,"Not logged in.");
    return Map.of("id",id,"name",session.getAttribute("farmerName"));
  }
  @PostMapping("/logout") @ResponseStatus(HttpStatus.NO_CONTENT) public void logout(HttpSession session) { session.invalidate(); }
}
